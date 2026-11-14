import Link from "next/link";
import { notFound } from "next/navigation";
import { displayName, getInteraction, isSample } from "@/lib/interactions";
import PersonName from "./PersonName";

export const dynamic = "force-dynamic";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function InteractionPage({ params }: { params: Promise<{ id: string }> }) {
  const item = await getInteraction((await params).id);
  if (!item) notFound();
  const sample = await isSample();
  const byspeaker = new Map(item.people.map((p) => [p.speaker, p]));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-accent">
        ← All interactions
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{item.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {new Date(item.started_at).toLocaleString()} · {Math.max(1, Math.round(item.duration_seconds / 60))} min
      </p>
      <p className="mt-4">{item.summary}</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">People</h2>
        <ul className="mt-3 space-y-2">
          {item.people.map((p) => (
            <li key={p.speaker} className="rounded-xl border border-line bg-panel px-4 py-3">
              <PersonName interactionId={item.id} person={{ ...p, voiceprint: undefined }} readOnly={sample} />
              <p className="mt-1 text-xs text-muted">{p.evidence}</p>
            </li>
          ))}
        </ul>
      </section>

      {item.follow_ups.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Follow-ups</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {item.follow_ups.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {item.topics.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Topics</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.topics.map((t) => (
              <span key={t} className="rounded-full border border-line px-3 py-1 text-sm">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Transcript</h2>
        <ol className="mt-3 space-y-3">
          {item.turns.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-12 shrink-0 pt-0.5 text-xs text-muted">{clock(t.start)}</span>
              <div>
                <div className="text-sm font-medium text-accent">
                  {displayName(byspeaker.get(t.speaker), t.speaker)}
                </div>
                <p>{t.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
