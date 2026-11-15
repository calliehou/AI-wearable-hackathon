"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Turn = { speaker: number; text: string; start: number; end: number };
type Voice = { name: string | null; is_wearer: boolean };
type Live = {
  updated_at: number | null;
  connected: boolean;
  recording: boolean;
  wearer?: string;
  voices: Record<string, Voice>;
  started_at?: string | null;
  turns: Turn[];
  interim?: { speaker: number; text: string } | null;
  last_saved_at?: number | null;
  silence_gap?: number;
  band?: number;
  level?: number | null;   // how loud the band hears things, 0-1
  problem?: string | null; // why no words are coming (e.g. the speech service rejected its key)
};

// One colour per voice; the wearer always gets the accent.
const COLOURS = ["#d9534f", "#2e8b57", "#c27c0e", "#2b7bb9", "#8e44ad", "#b03a7a"];

function voiceName(voices: Record<string, Voice>, speaker: number, wearer?: string) {
  if (speaker < 0) return "…";
  const v = voices[String(speaker)];
  if (v?.is_wearer) return `${v.name ?? wearer ?? "You"} (you)`;
  return v?.name ?? `Speaker ${speaker + 1}`;
}

function voiceColour(voices: Record<string, Voice>, speaker: number) {
  return voices[String(speaker)]?.is_wearer ? "var(--accent)" : COLOURS[speaker % COLOURS.length];
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LivePage() {
  const [live, setLive] = useState<Live | null>(null);
  const [now, setNow] = useState(() => Date.now() / 1000);
  const bottom = useRef<HTMLDivElement>(null);
  const [naming, setNaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (naming === null || !draft.trim()) return;
    const res = await fetch("/api/live/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker: naming, name: draft.trim() }),
    });
    setSaved(res.ok ? `Learning ${draft.trim()}'s voice…` : "Could not save the name.");
    setNaming(null);
    setTimeout(() => setSaved(""), 4000);
  }

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!stop) setLive(await res.json());
      } catch {
        /* the dev server restarting: try again next tick */
      }
      if (!stop) setNow(Date.now() / 1000);
    }
    poll();
    const id = setInterval(poll, 500);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const turnCount = live?.turns.length ?? 0;
  const interimText = live?.interim?.text;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottom.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [turnCount, interimText]);

  const loading = live === null;            // first answer not in yet: don't claim the listener is down
  const stale = !loading && (!live?.updated_at || now - live.updated_at > 5);
  const status = loading
    ? { label: "Checking the band…", colour: "var(--muted)" }
    : stale
    ? { label: "Listener not running", colour: "var(--muted)" }
    : live!.connected && live!.problem
      ? { label: "Band connected · not transcribing", colour: "#c27c0e" }
    : live!.recording
      ? { label: "Recording", colour: "#d9534f" }
      : { label: "Band disconnected", colour: "#c27c0e" };

  const voices = live?.voices ?? {};
  const speakers = Array.from(new Set((live?.turns ?? []).map((t) => t.speaker)))
    .filter((s) => s >= 0)
    .sort((a, b) => a - b);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Live</h1>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-accent">
          Saved interactions →
        </Link>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm" role="status" aria-live="polite">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: status.colour }} aria-hidden />
        <span>{status.label}</span>
        {!stale && !loading && <span className="text-muted">· band {live?.band}</span>}
        {!stale && !loading && live?.recording && typeof live.level === "number" && (
          <span className="ml-2 inline-flex items-center gap-2 text-muted">
            <span
              className="relative inline-block h-2 w-28 overflow-hidden rounded-full"
              style={{ background: "color-mix(in srgb, currentColor 18%, transparent)" }}
              role="meter" aria-label="How loud the band hears" aria-valuemin={0} aria-valuemax={100}
              aria-valuenow={Math.round(live.level * 100)}
            >
              <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200"
                style={{ width: `${Math.round(live.level * 100)}%`, background: live.level < 0.08 ? "#c27c0e" : "#3a9a5b" }} />
            </span>
            {live.level < 0.08 ? "very quiet: speak closer to the band" : "hearing sound"}
          </span>
        )}
      </div>

      {speakers.length > 0 && (
        <div className="mt-4" aria-label="Voices in this conversation">
          <div className="flex flex-wrap gap-2">
            {speakers.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setNaming(s);
                  setDraft(voices[String(s)]?.name ?? "");
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm hover:border-accent"
                aria-label={`Name ${voiceName(voices, s, live?.wearer)}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: voiceColour(voices, s) }} aria-hidden />
                {voiceName(voices, s, live?.wearer)}
                <span className="text-xs text-muted">{voices[String(s)]?.name ? "rename" : "name this voice"}</span>
              </button>
            ))}
          </div>
          {naming !== null && (
            <form onSubmit={saveName} className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="voice-name" className="text-sm">
                Who is {voiceName(voices, naming, live?.wearer)}?
              </label>
              <input
                id="voice-name"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`e.g. ${live?.wearer ?? "Mapa"}`}
                className="min-h-11 flex-1 rounded-lg border border-line bg-background px-3"
              />
              <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-medium text-on-accent">
                Save voice
              </button>
              <button type="button" onClick={() => setNaming(null)} className="min-h-11 px-3 text-muted">
                Cancel
              </button>
              <p className="w-full text-xs text-muted">
                The band learns this voice and recognises it from now on, in every conversation.
              </p>
            </form>
          )}
          {saved && <p className="mt-2 text-sm text-muted" role="status">{saved}</p>}
        </div>
      )}

      <section className="mt-6 flex-1 space-y-3" aria-label="Conversation in progress">
        {live?.turns.map((t, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-12 shrink-0 pt-1 text-xs text-muted">{clock(t.start)}</span>
            <div
              className="flex-1 rounded-xl border border-line bg-panel px-4 py-3"
              style={{ borderLeft: `4px solid ${voiceColour(voices, t.speaker)}` }}
            >
              <div className="text-sm font-medium" style={{ color: voiceColour(voices, t.speaker) }}>
                {voiceName(voices, t.speaker, live.wearer)}
              </div>
              <p className="mt-1">{t.text}</p>
            </div>
          </div>
        ))}

        {live?.interim && (
          <div className="flex gap-3">
            <span className="w-12 shrink-0" />
            <div
              className="flex-1 rounded-xl border border-dashed border-line px-4 py-3"
              style={{ borderLeft: `4px dashed ${voiceColour(voices, live.interim.speaker)}` }}
            >
              <div className="text-sm font-medium" style={{ color: voiceColour(voices, live.interim.speaker) }}>
                {voiceName(voices, live.interim.speaker, live.wearer)}
              </div>
              <p className="mt-1 italic text-muted">{live.interim.text}…</p>
            </div>
          </div>
        )}

        {!stale && !loading && live?.problem && (
          <p className="mt-3 rounded-lg p-3 text-sm" style={{ background: "color-mix(in srgb, #c27c0e 14%, transparent)" }}>
            <b>No words are coming through.</b> {live.problem} The band stays connected and the listener tries again
            every 30 s.
          </p>
        )}
        {!stale && !loading && !live?.problem && !live?.turns.length && !live?.interim && (
          <p className="text-muted">
            Listening… Words appear here as people speak. After {live?.silence_gap ?? 60} s of silence the conversation
            is saved and a new one starts.
          </p>
        )}
        {stale && (
          <p className="text-muted">
            Start the band listener to see the conversation here:{" "}
            <code className="text-sm">listener/run.sh</code> (it restarts itself if it crashes)
          </p>
        )}
        <div ref={bottom} />
      </section>
    </main>
  );
}
