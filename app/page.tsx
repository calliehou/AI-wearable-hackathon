import Link from "next/link";
import { isSample, listInteractions, others } from "@/lib/interactions";

export const dynamic = "force-dynamic";

function when(iso: string) {
  return new Date(iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function minutes(seconds: number) {
  return seconds < 60 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

export default async function Home() {
  const [items, sample] = await Promise.all([listInteractions(), isSample()]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Recent interactions</h1>
        <div className="flex gap-2">
        <Link
          href="/voices"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-medium"
        >
          Voices
        </Link>
        <Link
          href="/live"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-medium"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#d9534f]" aria-hidden />
          Live
        </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        The band records non-stop. Each conversation appears here after a minute of silence.
      </p>
      {sample && (
        <p className="mt-4 rounded-lg border border-line bg-panel px-4 py-3 text-sm">
          Showing sample data. Your first recording from the band replaces it.
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/interactions/${item.id}`}
              className="block min-h-11 rounded-xl border border-line bg-panel px-4 py-4 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{item.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {when(item.started_at)} · {minutes(item.duration_seconds)}
                </span>
              </div>
              <div className="mt-1 text-sm text-accent">{others(item).join(", ") || "Just you"}</div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{item.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="mt-6 text-muted">No interactions yet.</p>}
    </main>
  );
}
