// A promise the band heard you make to someone ("I'll send you $120 tonight").

export type Kind = "money" | "gift" | "task" | "plan" | "send" | "call" | "bring" | "meet" | "other";
export type PromiseType = "Money" | "Gift" | "Task" | "Plan";

export type Person = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  lastHeard: string; // "Heard 2h ago"
  lastTalk: string; // "2h", "3w", "—"
  moments: number; // conversations in the last 30 days
  open: number;
  kept: number;
  ring: 1 | 2 | 3; // orbit: 1 inner, 2 middle, 3 outer / drifting
  drifting: boolean;
  quietFor: string | null;
  circles: string[];
};

export type Todo = {
  id: string;
  title: string; // "Send Diego $120"
  quote: string; // what you said
  kind: Kind;
  type: PromiseType;
  personId: string | null; // null: the band didn't catch who it was. Pick them from contacts.
  personName: string | null;
  amount?: number;
  note?: string;
  dueLabel: string; // "Tonight", "Mon"
  dueDetail?: string; // "8:00 PM"
  heardLabel: string; // "heard 2h ago"
  heardAt: string; // "9:41 AM"
  heardIso: string;
  confidence: number;
  status: "open" | "done" | "dismissed";
  voiceKnown: boolean;
};

export type Circle = { name: string; color: string };
