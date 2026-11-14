// Types and display helpers shared by server pages and client components (no file access here).

export type Person = {
  speaker: number;
  name: string | null;
  is_wearer: boolean;
  evidence: string;
};

export type Turn = { speaker: number; text: string; start: number; end: number };

export type Interaction = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  source: string;
  title: string;
  summary: string;
  people: Person[];
  topics: string[];
  follow_ups: string[];
  turns: Turn[];
};

export function displayName(p: Person | undefined, speaker: number): string {
  if (p?.is_wearer) return p.name ? `${p.name} (you)` : "You";
  return p?.name ?? `Speaker ${speaker + 1}`;
}

// People in an interaction other than the wearer, for the list view.
export function others(item: Interaction): string[] {
  return item.people.filter((p) => !p.is_wearer).map((p) => displayName(p, p.speaker));
}
