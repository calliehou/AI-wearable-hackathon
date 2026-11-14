# CLAUDE.md — Mendly

> **Mendly turns the things you promise people into a living garden of your relationships.** A Vexo Band listens to your day. Mendly picks out who you talked to and what you committed to: money to pay back, a bill to split, a gift to buy, a plan to make. Each person becomes a plant that grows as you spend time together and blooms after warm moments. People you met once rest at the edge of the garden. *Friendship is the mend.*

Claude Code reads this file at the start of every session. Keep it short and current.
Built at VexoHacks (Y Combinator, San Francisco) in 5 hours by **Callie** and **Mapa**. Plan and checklists: `docs/PLAN.md`.

## Build order
1. **People + Promises** (P0): who you talked to, the last conversation, and open commitments. Money ("transfers") comes first.
2. **Garden** (P0): the home dashboard. People drawn as growing plants arranged in closeness rings, with auto tags (family, friend, classmate, work).
3. **Real data** (P0): Vexo transcript wired in through adapters.
4. **Rhythm + Nudges** (P1): a frequency strip showing how often you talk, a calendar of promises, and "it's been a while" nudges.
5. **Gift ideas** (P2), plus the **Memory map** of places you've been together (P2, uses phone location or a mock).

## Ownership
| | Callie | Mapa |
|---|---|---|
| Owns | `app/`, `app/api/`, `lib/pipeline/`, `lib/garden/`, `data/mock/`, deploy | `lib/adapters/`, `data/raw/`, `docs/vendor/`, pitch, README story |
| Builds | People + Promises, the Garden, Rhythm | Vexo (and other wearable) data access, then gifts and the pitch |

**The handoff point is `lib/types.ts`.** Adapters output these types, and the pipeline only reads these types. Neither side changes them without telling the other.

## Data contract — `lib/types.ts`
```ts
export type Source = 'vexo' | 'oura' | 'phone' | 'mock';

export interface Segment {            // one chunk of transcript
  id: string; start: string; end: string;   // ISO timestamps
  text: string;
  speaker: string | null;             // SDK label if available, else null
  source: Source;
}
export interface HeartSample { t: string; bpm: number; source: Source; }
export interface PlaceSample { t: string; lat: number; lng: number; label: string | null; source: Source; } // P2

export type Tag  = 'family' | 'friend' | 'partner' | 'classmate' | 'work' | 'other';
export type Tier = 'inner' | 'close' | 'around' | 'met_once';   // garden ring

export interface Person {
  id: string; name: string; aliases: string[];
  tags: Tag[];                        // auto-inferred, user can edit
  relationship: string | null;        // "manager", "roommate"…
  interests: string[];                // things they like (for gift ideas)
  conversationIds: string[];          // newest first
  firstSeen: string; lastSeen: string;
  warmth: number;                     // 0–1, share of warm/positive moments
  tier: Tier;                         // computed in lib/garden/score.ts
}

export type PromiseKind = 'money' | 'gift' | 'plan' | 'task' | 'other';
export interface Commitment {
  id: string; personId: string; conversationId: string;
  kind: PromiseKind;
  text: string;                       // "Pay Kelly back for dinner"
  amount: number | null; currency: string | null;
  direction: 'you_owe' | 'owes_you' | 'split' | null;  // money only
  due: string | null;                 // ISO date if mentioned
  status: 'open' | 'done';
}

export interface Conversation {
  id: string; start: string; end: string;
  personIds: string[];
  title: string; summary: string;     // written to the user ("You talked about…")
  keyPoints: string[];
  mood: 'warm' | 'neutral' | 'tense';
  place: string | null;
  segmentIds: string[];
}
```

## Pipeline
`Segment[]` → **group** (a gap of more than 5 min starts a new conversation) → **extract** with Claude using `prompts/people-extract.md` (people, summary, commitments, interests, mood; JSON only) → **merge** people by name or alias → **score** (`lib/garden/score.ts`) → save to `data/store.json`. There is no database.

**Garden score:** `growth = log2(1 + conversations in last 30 days) + 2·warmth`. Tier: `inner` ≥ 4, `close` ≥ 2.5, `around` ≥ 1, otherwise `met_once` (also anyone seen only once). Plant size = growth, blooms = warm conversations, and the ring is set by the tier.

## Stack
Next.js (App Router) + TypeScript + Tailwind on Vercel. The Garden is SVG + CSS animation. Use a shader only for the person-page hero, if there's time. The Claude API is called **only** from `app/api/*`. `ADAPTER_MODE=mock|real` switches between adapters. Mock data: `data/mock/day.json`.

## Rules for Claude
1. `main` must always build and demo. Work on a branch; merge only after `npm run build` passes.
2. Never read, print or commit `.env*` or keys. New variables go into `.env.example` with empty values.
3. Small commits (`feat:` `fix:` `ui:` `data:` `docs:`) after each working step.
4. If a change touches more than 2 files, plan first, then build.
5. If you're blocked on an SDK or API, build a mock behind the same interface, mark it `// MOCK`, list it in `docs/PLAN.md` under "Mocks in use", and keep going.
6. Read `docs/vendor/` before calling any device API. Never invent SDK calls.
7. **The tone is warm, never guilt-inducing.** A neglected relationship is "resting", not "dying". Nudges are invitations: "It's been 3 weeks since you saw Sam. Coffee?" No red warnings, and no scores that rank people's worth.
8. **Money is suggested, never assumed.** Every extracted amount needs a one-tap "confirm" before it counts.
9. **Privacy:** everything stays private to the user, and other people's words are summarized, never quoted.
10. Accessibility: touch targets ≥ 44px, contrast ≥ 4.5:1, respect `prefers-reduced-motion`.

## Design
Warm, soft and organic. Use the **Mineral Bloom** direction (seed `0KtCFUxwC`): warm stone, pearl, a periwinkle field, serif display (Instrument Serif) over Inter. Plants or stones grow and bloom, and the colors and motion follow that direction.

## Folders
```
app/                  /  (Garden)   /people/[id]   /promises   /rhythm
app/api/              ingest · extract · people · promises     (server only)
lib/types.ts          shared data contract
lib/adapters/         vexo.ts · phone.ts (+ .mock.ts)          Mapa
lib/pipeline/         group.ts · extract.ts · merge.ts         Callie
lib/garden/           score.ts · layout.ts                     Callie
prompts/              people-extract.md
data/mock/day.json    a fake week for development + demo
docs/                 PLAN.md · vendor/
```

## Commands
`npm run dev` · `npm run build` · `npm run lint` · push to `main` → Vercel deploys
