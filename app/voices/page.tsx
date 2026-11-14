// Voices: what the band remembers about each person's voice (the contact memory), and how
// every voice in recent conversations was identified, with its match score.
import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { listInteractions } from "@/lib/interactions";

export const dynamic = "force-dynamic";

type Match = { name: string | null; score: number; runner_up: string | null; runner_up_score: number; verdict: string; seconds?: number; how?: string };

function unit(v: number[]) {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}
function dot(a: number[], b: number[]) {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

const VERDICT: Record<string, { label: string; tone: string }> = {
  match: { label: "Recognised", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  loudest: { label: "Loudest voice (you)", tone: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" },
  weak: { label: "Not sure", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  none: { label: "No match", tone: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
};

export default async function Voices() {
  let memory: Record<string, number[][]> = {};
  try {
    memory = JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "voiceprints.json"), "utf-8"));
  } catch {
    /* nobody named yet */
  }
  const people = Object.entries(memory).map(([name, vecs]) => {
    const u = vecs.map(unit);
    const mean = unit(u[0].map((_, i) => u.reduce((s, v) => s + v[i], 0) / u.length));
    const consistency = u.length > 1 ? u.reduce((s, v) => s + dot(v, mean), 0) / u.length : 1;
    return { name, samples: vecs.length, consistency, mean };
  });
  const apart: { a: string; b: string; sim: number }[] = [];
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++) apart.push({ a: people[i].name, b: people[j].name, sim: dot(people[i].mean, people[j].mean) });

  const recent = (await listInteractions()).filter((i) => i.source.startsWith("band")).slice(0, 25);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-accent">← All interactions</Link>
      <h1 className="mt-2 text-2xl font-semibold">Voices</h1>
      <p className="mt-1 text-sm text-muted">
        What the band remembers about each person&apos;s voice, and how it decided who spoke in each conversation.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Contact memory</h2>
        {people.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm">
            No voices saved yet. Name a voice on the <Link className="text-accent underline" href="/live">Live page</Link> or in the Peri app.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {people.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted">
                  {p.samples} sample{p.samples === 1 ? "" : "s"}
                  {p.samples > 1 && <> · consistency {p.consistency.toFixed(2)}</>}
                  {p.samples < 5 && <span className="ml-2 text-amber-700 dark:text-amber-300">· learning (talk more)</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {apart.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            How alike they sound (lower is easier to tell apart):{" "}
            {apart.map((x) => `${x.a} vs ${x.b} ${x.sim.toFixed(2)}`).join(" · ")}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          A name is kept when the voice matches that person&apos;s memory at 0.40 or more and beats the next person. Clear
          matches (0.55+, 4 s+ of speech) are added to the memory, so recognition improves the more you talk.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Recent identifications</h2>
        <ul className="mt-3 space-y-3">
          {recent.map((it) => (
            <li key={it.id} className="rounded-xl border border-line bg-panel px-4 py-3">
              <Link href={`/interactions/${it.id}`} className="flex min-h-11 items-baseline justify-between gap-3">
                <span className="font-medium">{it.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(it.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </Link>
              <ul className="mt-1 space-y-1">
                {it.people.map((p) => {
                  const m = (p as unknown as { match?: Match }).match;
                  const v = m ? VERDICT[m.verdict] ?? VERDICT.none : null;
                  return (
                    <li key={p.speaker} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="min-w-24 font-medium">{p.name ?? `Speaker ${p.speaker + 1}`}</span>
                      {v ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${v.tone}`}>{v.label}</span>
                          {m && m.name && (
                            <span className="text-muted">
                              {m.name} {m.score.toFixed(2)}
                              {m.runner_up ? ` · next ${m.runner_up} ${m.runner_up_score.toFixed(2)}` : ""}
                              {m.seconds != null ? ` · ${m.seconds}s of speech` : ""}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">{p.evidence}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
