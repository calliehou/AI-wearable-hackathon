# Peri — Build Plan

> **Peri hears the promises you make and helps you keep them, so the people you care about stay in your orbit.**

**Re-baseline now. T+0:00 = ____ : ____ · Feature freeze (T+2:45) = ____ : ____ · Submit by (T+3:40) = ____ : ____**

Shrink the T+ times if you have less time left. Each task has a **⏱ timebox**: when it runs out, commit, mock the rest, and move on.
```bash
sleep $((30*60)) && say "Time is up. Commit and move on."
```

## ✅ Callie — UI + orbit + pipeline

| # | Task | ⏱ | Due | Done when | Status |
|---|---|---|---|---|---|
| C1 | Update `lib/types.ts` to the Peri contract; Tailwind tokens from `docs/DESIGN.md`; add the Plus Jakarta Sans font | 15m | T+0:15 | Builds | ⬜ |
| C2 | Mock data `data/mock.json`: 11 people, 4 circles, 7 promises (3 due today), 4 activities for Kelly | 10m | T+0:25 | Loads | ⬜ |
| C3 | **My orbit** `/`: rotating rings, avatars by ring, badges, due-today ring; scroll down to Due today postcards + This week checklist | 45m | T+1:10 | Matches `Main.dc.html` | ⬜ |
| C4 | Bottom nav with center mic + **Contacts** `/contacts` | 20m | T+1:30 | Matches `People.dc.html` | ⬜ |
| C5 | **Person** `/person/[id]`: stats, Recent activity sheet, open promises, About card | 30m | T+2:00 | Matches `Person.dc.html` | ⬜ |
| C6 | 🔁 **Handoff with Mapa:** `/mic` → `/api/extract` → confirm → the promise appears on the orbit | 20m | T+2:20 | Live voice note works | ⬜ |
| C7 | Pay → Promise kept flow (mock), or Ask Peri `/ask` if there's time | 25m | T+2:45 | Clickable | ⬜ |
| — | 🧊 **FEATURE FREEZE** | | T+2:45 | | ⬜ |
| C8 | Bug fixes, polish, deploy | 30m | T+3:15 | Demo runs twice | ⬜ |
| C9 | README tech section + screenshots | 15m | T+3:30 | Done | ⬜ |
| C10 | Final push; repo public; Vercel URL works in incognito | 10m | T+3:40 | Links open | ⬜ |

## ✅ Mapa — Data, voice, prompts, pitch

| # | Task | ⏱ | Due | Done when | Status |
|---|---|---|---|---|---|
| M1 | Vexo SDK: get one live transcript; save it to `data/raw/` | 30m | T+0:30 | Transcript text in hand | ⬜ |
| M2 | Export real contacts (Callie's / test set) → `data/contacts.json` in the `Person` shape (name, circle, about) | 25m | T+0:55 | 10+ contacts | ⬜ |
| M3 | `app/api/extract` + `prompts/extract.md`; test on 4 sentences: money, gift, task, plan | 40m | T+1:35 | 4/4 sorted correctly | ⬜ |
| M4 | Speech-to-text for `/mic`: Vexo transcript if available, otherwise the Web Speech API | 30m | T+2:05 | Speak → text | ⬜ |
| M5 | 🔁 **Handoff with Callie** (C6) | 20m | T+2:20 | Works live | ⬜ |
| M6 | Pitch deck: problem → Peri → live demo → why a wearable → privacy → business | 25m | T+2:45 | 6 slides | ⬜ |
| — | 🧊 **FEATURE FREEZE** | | T+2:45 | | ⬜ |
| M7 | Rehearse twice; **record the backup video** | 30m | T+3:15 | Video saved | ⬜ |
| M8 | README story (intro, problem, demo link, privacy, team) | 15m | T+3:30 | Done | ⬜ |
| M9 | **Submit** + screenshot the confirmation | 10m | T+3:40 | Confirmed | ⬜ |

## Demo story (2 min)
1. **Orbit:** "This is Maya's orbit." Diego is close, with an orange ring: $120 due tonight.
2. Swipe the **Due today** postcards: Diego's $120, Kelly's birthday.
3. **Hold the mic:** "Remind me to bring Leo his charger tomorrow, and I owe Mom $40." Peri sorts it into 2 promises, and Leo and Mom's badges go up.
4. **Kelly's page:** recent activity, the About card, a gift idea.
5. **Pay Diego** → Promise kept → "Diego stays in your inner orbit."
6. "Peri hears the promises you make and helps you keep them."

## Mocks in use (list honestly in the README)
- Payments (no real money moves)
-
