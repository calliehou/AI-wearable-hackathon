# CLAUDE.md — Peri

> **Peri hears the promises you make and helps you keep them, so the people you care about stay in your orbit.**
> The name comes from *perigee*, the point where an orbit comes closest. A Vexo Band listens for commitments in conversation ("I'll send you $120 tonight", "your birthday's Saturday, right?"). Peri files each one under the right person as **money, gift, task or plan**, puts that person in your **orbit**, and helps you keep the promise with reminders, gift ideas or an in-app transfer.

Claude Code reads this file at the start of every session. Keep it current.
Built at VexoHacks (Y Combinator, SF) by **Callie** (design engineering) and **Mapa** (business + data). Plan and checklists are in `docs/PLAN.md`. Screen-by-screen design reference is in `docs/DESIGN.md` and `design/screens/*.dc.html`.

## Core concept: the orbit
- **You** sit at the center. People orbit you on 3 rings: **inner** (due soon or very close), **middle**, **outer** (someone you're drifting from, or met once).
- The **badge** on each avatar is that person's count of open promises. A **ring around the avatar** in orange (#F26A3D) means something is due today.
- **Circles** are user-editable tags: Family, Friends, Work, School, plus any the user adds. Each has a pastel color.
- Keeping promises keeps people close. Going quiet makes them drift outward. Treat drifting as a gentle nudge, never as guilt.

## Screens to build (priority order)
| P | Route | Screen | Design ref |
|---|---|---|---|
| P0 | `/` | **My orbit**: animated rings + avatars; scroll down to **Due today** (swipeable postcards) and **This week** (checkable list) | `Main.dc.html` |
| P0 | `/contacts` | Contacts sorted by open promises; "All clear" collapsed | `People.dc.html` |
| P0 | `/person/[id]` | Person: stats, **Recent activity** sheet, open promises, **About** memory card | `Person.dc.html` |
| P0 | `/mic` | Hold the mic → speak → Peri sorts what you said into promises → Save / "Adjust with Peri" | `Mic.dc.html` |
| P0 | `/heard/[id]` | Promise heard from the band: confirm type, person, amount, due date | `Detected.dc.html` |
| P1 | `/ask` | **Ask Peri**: swipeable suggestions + chat to adjust promises | `Rhythm.dc.html` |
| P1 | `/pay/[id]` → `/kept/[id]` | Transfer confirm (full / split), then Promise kept. **Mock payment, no real money.** | `Transfer`, `Sent` |
| P2 | `/circles` | Create, edit and recolor circles; move people between them | `Circles.dc.html` |
| P2 | `/gift/[id]` | Gift ideas based on what the person has mentioned | `Gift.dc.html` |
| P2 | `/band` | Listening toggle + privacy promises | `Band.dc.html` |
| demo | — | Lock-screen notification, Places, Welcome: static images in the pitch | `Lock`, `Places`, `Launch` |

The bottom nav is a dark pill: Orbit · Contacts · **Mic (white circle, center)** · Ask Peri · Band.

## Ownership
| | Callie | Mapa |
|---|---|---|
| Owns | `app/`, `components/`, `lib/orbit/`, `lib/pipeline/`, deploy | `lib/adapters/` (Vexo, contacts), `data/`, `prompts/`, pitch, README story |
| Builds | UI for every screen, the orbit layout, the pipeline | Vexo transcript access, real contact import, prompt tuning, demo recordings |

**The handoff point is `lib/types.ts`.** Neither side changes it without telling the other.

## Data contract (`lib/types.ts`)
```ts
export type Source = 'vexo' | 'mic' | 'manual' | 'mock';
export type Kind = 'money' | 'gift' | 'task' | 'plan';
export type Ring = 'inner' | 'middle' | 'outer';

export interface Circle { id: string; name: string; color: string; }   // pastel hex

export interface Person {
  id: string; name: string; initial: string;
  circleIds: string[];
  about: { who: string | null; now: string | null; goodToKnow: string[] };  // "About Kelly" memory card
  interests: string[];                // chips + gift ideas
  lastTalk: string | null;            // ISO
  keptCount: number;
  metOnce: boolean;
}

export interface Promise {
  id: string; personId: string; kind: Kind;
  title: string;                      // "Send Diego $120"
  quote: string | null;               // the words heard, e.g. "I'll send you $120 tonight"
  amount: number | null; direction: 'you_owe' | 'owes_you' | null;
  due: string | null;                 // ISO
  status: 'pending_confirm' | 'open' | 'done';
  source: Source; heardAt: string;
}

export interface Activity {           // "Recent activity" log on the person page
  id: string; personId: string; at: string;
  title: string;                      // "Dinner on Valencia"
  note: string;                       // one line; other people's words are summarized, never quoted
  promiseIds: string[];
}
```

**Orbit ring** (`lib/orbit/ring.ts`):
- `inner` if an open promise is due within 24 h, or the person had 3+ talks in the last 14 days
- `outer` if `metOnce`, or no talk in the last 21 days (drifting)
- `middle` otherwise
- Badge = count of `open` promises.

## Pipeline
transcript text (from Vexo or the mic) → `POST /api/extract` → Claude with `prompts/extract.md` → JSON `{ promises[], activity, personUpdates }` → user confirms → saved to `data/store.json` (no database).

## Stack
Next.js (App Router) + TypeScript + Tailwind, mobile-first at 390 px wide, deployed on Vercel. Font: Plus Jakarta Sans. Claude API only from `app/api/*`. Speech-to-text for `/mic`: use the Vexo SDK if it gives a transcript, otherwise the browser Web Speech API, otherwise a typed fallback. `ADAPTER_MODE=mock|real`.

## Rules for Claude
1. `main` must always build and demo. Branch, then merge only after `npm run build` passes.
2. Never read, print or commit `.env*` or keys. New variables go into `.env.example` with empty values.
3. Make small commits (`feat:` `fix:` `ui:` `data:`).
4. If a change touches more than 2 files, plan first.
5. If you're blocked, ship a mock behind the same interface, mark it `// MOCK`, and list it in `docs/PLAN.md`.
6. **Match the design files.** Before building a screen, read its `design/screens/*.dc.html`; copy its colors, spacing, radii and copy.
7. Tone is warm, never guilt-inducing. A person drifting gets a nudge, never a warning.
8. Money never moves without explicit confirmation. Payments are mocked in this build.
9. Privacy: audio is never stored, and other people's words are summarized, not quoted. Only the user's own words appear as quotes.
10. Accessibility: touch targets ≥ 44px, contrast ≥ 4.5:1, respect `prefers-reduced-motion` (it stops the orbit spin).

## Commands
`npm run dev` · `npm run build` · `npm run lint` · push to `main` → Vercel deploys
