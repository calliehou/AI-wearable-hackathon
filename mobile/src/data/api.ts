// Talks to the web app running on the Mac (npm run dev, port 3000). In Expo Go the phone
// already reaches the Mac for the app bundle, so the same address is used here.
import Constants from "expo-constants";
import type { Kind } from "./types";

export function serverUrl(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : null;
}

export type Parsed = {
  quote: string;
  is_promise: boolean;
  person_name: string | null;
  title: string;
  kind: Kind;
  amount: number | null;
  due_label: string;
  due_detail: string | null;
};

// Sends a recording (file uri) or typed words; returns what Claude understood.
export async function parsePromise(input: { uri?: string; text?: string }, people: string[]): Promise<Parsed> {
  const base = serverUrl();
  if (!base) throw new Error("Can't find the Mac. Start the app with npx expo start on the same Wi-Fi.");
  const form = new FormData();
  form.append("people", people.join(", "));
  if (input.text) form.append("text", input.text);
  if (input.uri) form.append("audio", { uri: input.uri, name: "promise.m4a", type: "audio/mp4" } as unknown as Blob);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${base}/api/voice-todo`, { method: "POST", body: form, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `The Mac answered ${res.status}.`);
    return data as Parsed;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("The Mac took too long to answer.");
    if ((e as Error).message === "Network request failed")
      throw new Error("Can't reach the Mac. Is npm run dev running, on the same Wi-Fi?");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
