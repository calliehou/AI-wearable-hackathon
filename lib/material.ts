// What the band knows about one person, as plain text for Claude.
import { logWith, recentWith } from "./peri";

export async function materialAbout(name: string, days = 30) {
  const { talks, promises } = await recentWith(name, days);
  const lines = [
    ...promises.map((p) => `Promise (${p.status}): ${p.title}${p.amount ? ` $${p.amount}` : ""}, due ${p.due_label}. You said: "${p.quote}"`),
    ...talks.slice(0, 15).map((t) =>
      `${new Date(t.started_at).toDateString()}: ${t.title}. ${t.summary}` +
      (t.topics.length ? ` Topics: ${t.topics.join(", ")}.` : "") +
      (t.follow_ups.length ? ` Follow-ups: ${t.follow_ups.join("; ")}.` : "")),
  ];
  return { text: lines.join("\n"), count: talks.length, log: await logWith(name, days) };
}
