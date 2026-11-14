// Talks to the web app running on the Mac (npm run dev, port 3000). In Expo Go the phone
// already reaches the Mac for the app bundle, so the same address is used here.
import Constants from "expo-constants";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import type { Circle, Kind, Person, PromiseType, Todo } from "./types";

export function serverUrl(): string | null {
  // To use another Mac's band data (e.g. Callie running Expo on her laptop while the band
  // is on Mapa's Mac): start Expo with EXPO_PUBLIC_PERI_SERVER=http://<that Mac's IP>:3000
  const override = process.env.EXPO_PUBLIC_PERI_SERVER;
  if (override) return override.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;
  // Web preview on the Mac itself.
  if (Platform.OS === "web" && typeof window !== "undefined") return `http://${window.location.hostname}:3000`;
  return null;
}

function base(): string {
  const b = serverUrl();
  if (!b) throw new Error("Can't find the Mac. Start the app with npx expo start on the same Wi-Fi.");
  return b;
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base()}${path}`, { ...init, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `The Mac answered ${res.status}.`);
    return data as T;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("The Mac took too long to answer.");
    if ((e as Error).message === "Network request failed")
      throw new Error("Can't reach the Mac. Is npm run dev running, on the same Wi-Fi?");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

// ---- what the band heard

export type UnknownVoice = { interaction_id: string; speaker: number; quote: string; title: string; heard: string; seconds: number };
export type Rec = { kind: string; personId: string | null; title: string; sub: string; cta: string; target: string };
export type Snapshot = {
  people: (Omit<Person, "phone" | "email"> & { lastAt: string })[];
  todos: Todo[];
  unknownVoices: UnknownVoice[];
  circles: Circle[];
  recs: Rec[];
  stats: { promisesToday: number; conversationsToday: number };
  band: { running: boolean; connected: boolean; recording: boolean; paused: boolean };
};

export const fetchSnapshot = () => call<Snapshot>("/api/peri", { cache: "no-store" } as RequestInit, 8000);

export type PromiseChange = {
  person_name?: string | null; status?: Todo["status"]; type?: PromiseType; due_label?: string;
  due_detail?: string | null; amount?: number | null; title?: string;
  due_date?: string | null; due_time?: string | null;
};
export const updatePromise = (id: string, change: PromiseChange) => call(`/api/peri/promises/${id}`, json("PATCH", change));

export const reorderPromises = (ids: string[]) => call("/api/peri/promises/order", json("POST", { ids }));

export const deletePromise = (id: string) => call(`/api/peri/promises/${id}`, { method: "DELETE" });

export const nameVoice = (v: UnknownVoice, name: string) =>
  call("/api/peri/voices", json("POST", { interaction_id: v.interaction_id, speaker: v.speaker, name }));

export type NewPromise = {
  title: string; quote: string; kind: Kind; amount: number | null; due_label: string; due_detail: string | null; person_name: string | null;
  due_date?: string | null; due_time?: string | null;
};
export const createPromise = (p: NewPromise) => call<{ id: string }>("/api/peri/promises", json("POST", p));

export const createCircle = (name: string, color: string) => call("/api/peri/circles", json("POST", { name, color }));
export const setMembership = (person: string, circle: string, member: boolean) =>
  call("/api/peri/circles/members", json("POST", { person, circle, member }));

export const setPayee = (person: string, change: import("./types").Payee) => call("/api/peri/payee", json("POST", { person, ...change }));

export const renamePerson = (from: string, to: string) => call<{ id: string; name: string }>("/api/peri/people/rename", json("POST", { from, to }));

export const setOrbit = (person: string, ring: 1 | 2 | 3 | null) => call("/api/peri/people/orbit", json("POST", { person, ring }));

export const pauseBand = (paused: boolean) => call("/api/peri/band", json("POST", { paused }));

// ---- things Claude works out on the Mac

export type About = {
  who: string | null; right_now: string | null; good_to_know: string | null; interests: string[];
  places: { name: string; when: string; note: string }[];
  log: { id: string; title: string; when: string; note: string }[]; count: number; error?: string;
};
export const fetchAbout = (name: string) => call<About>(`/api/peri/about?name=${encodeURIComponent(name)}`, undefined, 60000);

export type Gifts = { occasion: string | null; said: string | null; ideas: { title: string; why: string; price: string }[]; count: number };
export const fetchGifts = (name: string) => call<Gifts>(`/api/peri/gifts?name=${encodeURIComponent(name)}`, undefined, 60000);

export type AskAnswer = { reply: string; applied: { id: string; title: string; due_label: string; status: string }[] };
export const askPeri = (message: string, history: { role: "user" | "peri"; text: string }[]) =>
  call<AskAnswer>("/api/peri/ask", json("POST", { message, history }), 60000);

// Spoken recap of the last week with someone (ElevenLabs on the Mac).
export type Recap = { text: string; audio: string | null; note?: string };
export async function fetchRecap(name: string): Promise<Recap> {
  const r = await call<Recap>(`/api/peri/recap?name=${encodeURIComponent(name)}`, undefined, 60000);
  return { ...r, audio: r.audio ? `${base()}${r.audio}` : null };
}

// ---- hold mic: tell Peri one or more promises

export type Parsed = {
  person_name: string | null; title: string; kind: Kind; amount: number | null; due_label: string; due_detail: string | null;
  due_date: string | null; due_time: string | null;
};
export async function parsePromises(input: { uri?: string; text?: string }, people: string[]): Promise<{ quote: string; promises: Parsed[] }> {
  const form = new FormData();
  form.append("people", people.join(", "));
  if (input.text) form.append("text", input.text);
  // Expo's fetch needs a real Blob here (the old { uri, name, type } object is "Unsupported
  // FormDataPart implementation"); expo-file-system's File is one.
  if (input.uri) form.append("audio", new File(input.uri), "promise.m4a");
  return call("/api/voice-todo", { method: "POST", body: form }, 45000);
}
