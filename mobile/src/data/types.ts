// A to-do the band heard you promise someone ("I'll send you the deck Monday").

export type Kind = "money" | "send" | "call" | "bring" | "meet" | "other";

export type Person = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  relation?: string; // "friend", "family"...
  lastHeard?: string; // "Heard 3 days ago"
  recap?: string; // spoken recap of the last week, from the band's conversations
};

export type Todo = {
  id: string;
  title: string; // "Send Diego $120"
  quote: string; // what was said: "I'll send you $120 tonight"
  kind: Kind;
  personId: string | null; // null: the band didn't catch who it was. Pick them from contacts.
  amount?: number; // money promises
  note?: string; // "Tickets for Friday"
  dueLabel: string; // "Tonight", "Mon"
  dueDetail?: string; // "8:00 PM"
  heardLabel: string; // "heard yesterday"
  heardAt: string; // "9:41 AM"
  confidence: number; // 0..1, how sure the band is this was a promise
  attachment?: string; // "Q3 deck · latest version from Drive"
  status: "open" | "done" | "dismissed";
};
