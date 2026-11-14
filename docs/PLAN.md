# Mendly — Build Plan

> **Mendly turns the things you promise people into a living garden of your relationships.** Your Vexo Band hears "I'll pay you back for dinner" or "let's get coffee next week". Mendly saves that promise with the person who heard it, and it grows that friendship in your garden each time you talk. *Friendship is the mend.*

**Re-baseline after the pivot. T+0:00 = now: ____ : ____  · Freeze (T+3:15): ____ : ____  · Submit by (T+4:20): ____ : ____**

Each task has a **⏱ timebox**. When it runs out: commit, mock the rest, and move on.
```bash
sleep $((30*60)) && say "Time is up. Commit and move on."
```

---

## The idea on one screen

| Screen | What you see | Priority |
|---|---|---|
| **Garden** (home) | You at the center. Each person is a plant in a ring: **inner circle, close, around**. A plant grows with how often you talk and blooms after warm moments. People you've met once are **seeds** resting at the edge. Filter by tag: family, friends, classmates, work. | P0 |
| **Person** | A large plant at the top, then: **Last time** (summary) · **Open promises** · **Money** ("You owe Kelly $24, dinner, Tue") · **Things they like** · history | P0 |
| **Promises** | Every open commitment, grouped: 💸 money · 🎁 gifts · 📅 plans · ✅ tasks. One tap to confirm or mark done. | P0 |
| **Rhythm** | A frequency strip per person, like a heat map of when you talked. Also a calendar of due promises, and a gentle nudge: "It's been 3 weeks since Sam." | P1 |
| **Gift ideas** | "Kelly loves thrift shopping and matcha. Ideas: …" Based on interests from your conversations. | P2 |
| **Memory map** | Places you've been together, from phone location (or mock). | P2 |

---

## ✅ Callie — People + Promises + Garden

Mark each task ⬜ → 🟨 → ✅ (🟥 = blocked).

| # | Task | ⏱ Timebox | Due | Done when | Status |
|---|---|---|---|---|---|
| C1 | Update `lib/types.ts` to the new contract in CLAUDE.md (Person tags/tier, Commitment) | 10 min | T+0:10 | Types compile | ⬜ |
| C2 | Regenerate `data/mock/day.json` as **one week**: 12–15 conversations, 7–8 people (2 family, 2 friends, 1 classmate, 1 manager, 2 met once), with 3 money promises, 1 birthday gift, 2 plans | 15 min | T+0:25 | The story reads well | ⬜ |
| C3 | Pipeline: group → extract (new prompt) → merge → `lib/garden/score.ts` → `data/store.json` | 40 min | T+1:05 | Mock week → people, promises, tiers | ⬜ |
| C4 | **Person** page: last time · open promises · money · things they like · history | 30 min | T+1:35 | Tap a person → full card | ⬜ |
| C5 | **Garden** home: SVG rings, plant size = growth, blooms = warm conversations, seeds at the edge, tag filter | 45 min | T+2:20 | Looks alive; tap a plant → Person | ⬜ |
| C6 | 🔁 **Handoff test with Mapa:** real Vexo transcript → pipeline | 15 min | T+2:35 | A real person appears in the garden | ⬜ |
| C7 | **Promises** page + confirm / done | 20 min | T+2:55 | Confirming money updates the person | ⬜ |
| C8 | **Rhythm** (P1): frequency strip + "it's been a while" nudge | 20 min | T+3:15 | Nudge shows for a resting friend | ⬜ |
| — | 🧊 **FEATURE FREEZE** | — | T+3:15 | | ⬜ |
| C9 | Bug fixes, grow animation polish, lock `main` | 35 min | T+3:50 | Demo runs twice cleanly | ⬜ |
| C10 | README tech sections + architecture diagram | 20 min | T+4:10 | Setup steps work | ⬜ |
| C11 | Final push; repo public; deploy URL works in incognito | 10 min | T+4:20 | Links open | ⬜ |

## ✅ Mapa — Wearable data + gifts + pitch

| # | Task | ⏱ Timebox | Due | Done when | Status |
|---|---|---|---|---|---|
| M1 | Vexo adapter → `Segment[]` (continue from before) | 40 min | T+0:40 | Returns contract types | ⬜ |
| M2 | **Tell Callie:** speaker labels? timestamps? anything about location? | 5 min | T+0:45 | Posted in chat | ⬜ |
| M3 | Record 3–4 **real demo conversations** on the band with promises in them ("I'll Venmo you $20", "Your birthday's on the 20th, right?") | 25 min | T+1:10 | Saved in `data/raw/` | ⬜ |
| M4 | `lib/adapters/phone.ts` → `PlaceSample[]` (browser geolocation or mock) for the Memory map | 25 min | T+1:35 | Returns contract types or a mock | ⬜ |
| M5 | Tune `prompts/people-extract.md` on the real recordings: do promises and amounts come out right? | 30 min | T+2:05 | 3 out of 4 promises are correct | ⬜ |
| M6 | 🔁 **Handoff test with Callie** | 15 min | T+2:35 | A real person appears in the garden | ⬜ |
| M7 | Gift ideas (P2): a small API route from `interests` → 3 ideas (only if C7 is done) | 20 min | T+2:55 | Ideas show on the Person page | ⬜ |
| M8 | Pitch deck: problem (vague promises get lost) → Mendly → demo → why a wearable → business → privacy | 40 min | T+3:15 | 6–8 slides | ⬜ |
| — | 🧊 **FEATURE FREEZE** | — | T+3:15 | | ⬜ |
| M9 | Rehearse the 2-min demo twice; **record the backup video** | 35 min | T+3:50 | Video saved | ⬜ |
| M10 | README story: intro, problem, video link, privacy, team | 20 min | T+4:10 | Reads well in 60 seconds | ⬜ |
| M11 | **Submit:** GitHub link + README + video; screenshot the confirmation | 10 min | T+4:20 | Confirmation saved | ⬜ |

**Buffer: whatever is left after T+4:20.** Don't spend it on features.

---

## Checkpoints

| When | Check | If it fails |
|---|---|---|
| T+0:45 | What Vexo gives us (M2) | Callie stays on the mock week; Mapa records with laptop mic + speech-to-text |
| T+2:35 | Real data → garden (C6 / M6) | Demo on the mock week, plus one real recording on a "Just now" card |
| T+3:15 | Feature freeze | Drop Rhythm and gifts; Garden + Person + Promises is enough to win |
| T+3:50 | Backup video exists | Record it immediately |

## Demo story (2 min)
1. **Garden:** "This is Maya's week." Her sister's plant is tall and blooming, her roommate is close, and a guy from a mixer is a seed at the edge.
2. **Live:** Mapa says to the band, "Kelly, I'll pay you back the $24 for dinner, and your birthday's Saturday, right?"
3. Refresh: Kelly's plant grows a little. A **money promise** and a **birthday** appear on her card.
4. **Promises:** confirm the $24 → it counts.
5. **Rhythm:** "It's been 3 weeks since Sam. Coffee?"
6. "The things we promise people are how friendships stay mended. **Mendly** remembers them for you."

## Mocks in use
List anything faked here (it goes into the README, honestly):
- 
