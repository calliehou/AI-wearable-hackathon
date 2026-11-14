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
};

// One colour per voice; the wearer always gets the accent.
const COLOURS = ["#d9534f", "#2e8b57", "#c27c0e", "#2b7bb9", "#8e44ad", "#b03a7a"];

function voiceName(voices: Record<string, Voice>, speaker: number, wearer?: string) {
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

  const stale = !live?.updated_at || now - live.updated_at > 5;
  const status = stale
    ? { label: "Listener not running", colour: "var(--muted)" }
    : live!.recording
      ? { label: "Recording", colour: "#d9534f" }
      : { label: "Band disconnected", colour: "#c27c0e" };

  const voices = live?.voices ?? {};
  const speakers = Array.from(new Set((live?.turns ?? []).map((t) => t.speaker))).sort((a, b) => a - b);

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
        {!stale && <span className="text-muted">· band {live?.band}</span>}
      </div>

      {speakers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Voices in this conversation">
          {speakers.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-sm"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: voiceColour(voices, s) }} aria-hidden />
              {voiceName(voices, s, live?.wearer)}
            </span>
          ))}
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

        {!stale && !live?.turns.length && !live?.interim && (
          <p className="text-muted">
            Listening… Words appear here as people speak. After {live?.silence_gap ?? 60} s of silence the conversation
            is saved and a new one starts.
          </p>
        )}
        {stale && (
          <p className="text-muted">
            Start the band listener to see the conversation here:{" "}
            <code className="text-sm">.venv/bin/python listener/listen.py</code>
          </p>
        )}
        <div ref={bottom} />
      </section>
    </main>
  );
}
