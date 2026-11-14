# 6-Hour Build Plan — Callie × Mapa

Times are relative to build start (**T+0:00**). Write the real clock times in the right column when the build starts.

## Roles

| | **Callie** — Build | **Mapa** — Story & Strategy |
|---|---|---|
| Owns | `app/`, `lib/`, API routes, Vexo integration, deploy | `docs/`, `prompts/`, pitch deck, demo video, README narrative |
| Drives Claude Code for | features, integration, UI, bug fixes | prompt writing, mock data, test scripts, README draft (only in `docs/` + `prompts/`) |
| Main question | "Does it work end to end?" | "Why does this matter, and will judges get it in 2 minutes?" |
| Also | technical risk calls | judging-criteria map, user interviews, timekeeper, first tester |

**Shared decisions (both must agree):** idea lock (T+0:30), scope cut (T+3:00), feature freeze (T+4:30).

## Timeline

| T+ | Clock | Callie | Mapa | Gate |
|---|---|---|---|---|
| 0:00–0:30 | | Run Vexo SDK "hello world": band → transcript on screen. Paste SDK docs into `docs/vendor/`. | Map judging criteria → features. Fill **Project** block in `CLAUDE.md`. Draft one-liner + wow moment. | **Idea locked** |
| 0:30–1:00 | | Scaffold routes + adapters (real + mock). Deploy hello world to Vercel. | Write `docs/DEMO.md` (2-min script). Write companion persona in `prompts/`. | Demo script agreed |
| 1:00–2:30 | | **Core loop P0:** voice in → LLM decides → haptic/UI out. Parallel: `ui-builder` on main screen. | 3–5 quick interviews (Vexo team, other hackers). Collect quotes. Start deck. Test the loop as soon as it exists. | |
| 2:30–3:00 | | Merge; end-to-end on `main`. | Run the demo script on the real build; log bugs as issues. | **Checkpoint: E2E works (ugly OK)** |
| 3:00 | | | | **Scope cut:** if E2E fails → mock the broken piece (Wizard of Oz) and move on |
| 3:00–4:30 | | P1: wow moment polish, 1 extra signal (vision / env / location), design pass. | Deck to 80%. Business model + "why Vexo" slide. Record b-roll / screenshots. | |
| 4:30 | | | | **Feature freeze** — bugs only after this |
| 4:30–5:15 | | Bug fixes from `demo-qa`. Lock `main`. | Rehearse demo ×2 with timer. **Record backup demo video.** | Backup video saved |
| 5:15–5:45 | | Run `readme-writer`; add architecture diagram + setup steps. | Edit README narrative, add GIF/video link, final deck. | |
| 5:45–6:00 | | Final push, verify repo is public + deploy URL works. | **Submit** (GitHub link + README + video). Screenshot the confirmation. | **Submitted** |

## Rituals

- **Hourly sync, 5 min, on the hour:** each person says done / next / blocked, then updates `docs/PROGRESS.md`. Mapa keeps time.
- **Blocked > 20 min → say it out loud.** Either pair on it or mock it.
- **Priorities:** P0 = demo breaks without it. P1 = makes it win. P2 = nice to have (likely cut). Track as GitHub Issues with labels `P0` `P1` `P2` `callie` `mapa`.

## Branches & merging

- `main` = always demo-able (Vercel production).
- `callie/<feature>`, `mapa/docs`, and worktrees for parallel Claude sessions.
- Merge to `main` only after `npm run build` passes. Mapa's `docs/` and `prompts/` changes rarely conflict, so merge them often.

## Parallel Claude Code sessions (git worktrees)

```bash
# from repo root
git worktree add ../hw-ui -b callie/ui
git worktree add ../hw-core -b callie/core
# terminal 1: cd ../hw-core && claude   → integrator work
# terminal 2: cd ../hw-ui && claude     → ui-builder work
# Mapa's laptop: main repo, branch mapa/docs
```

Rules: one worktree per area of the code, with no two sessions editing the same files. Merge back through `main`.

## Fallbacks (decide early, not at T+5)

| Risk | Fallback |
|---|---|
| Vexo SDK not working | `lib/adapters/vexo.mock.ts` replays a recorded transcript; laptop mic as input |
| LLM latency too slow for demo | Pre-warm, stream responses, shorter prompts; cache demo responses |
| Location/geofence hard to demo indoors | "Simulate arrival" button that fires the same event |
| Live demo fails on stage | Backup video (recorded T+4:30–5:15) |
