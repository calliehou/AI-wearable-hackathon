# CLAUDE.md — AI Wearable Hackathon (VexoHacks @ YC)

Claude Code reads this file at the start of every session. Keep it short and current.
Update the **Project** block as soon as the idea is locked (T+0:30).

## Project
- **One-liner:** [TBD at T+0:30 — e.g. "A voice companion on your wrist that ___ so that ___"]
- **User:** [TBD]
- **Wow moment (the 10 seconds judges remember):** [TBD]
- **Demo script:** see `docs/DEMO.md`
- **Signals used:** always-on voice (Vexo Band) + [vision / environment / location / HRV — pick ≤ 1 extra]

## Team
- **Callie** — design engineering + prototype. Owns `app/`, `lib/`, integration, deploy.
- **Mapa** — business / strategy. Owns `docs/`, `prompts/`, pitch, README narrative, user tests.
- Ownership rule: don't edit the other person's folders without saying so in chat.

## Stack (change only if the Vexo SDK forces it)
- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel
- LLM: Claude API via server routes only (`app/api/*`) — never call model APIs from the browser
- Vexo Band SDK: [fill in after kickoff — paste docs into `docs/vendor/vexo.md`]
- Optional: browser Geolocation (geofence), getUserMedia (camera), weather/AQI APIs

## Rules for Claude
1. **`main` must always run and demo.** Work on a branch; merge only when `npm run build` passes.
2. **Never read, print, or commit `.env*` files or API keys.** Use `process.env.X`; add new vars to `.env.example` with an empty value.
3. Small commits with clear messages (`feat:`, `fix:`, `ui:`, `docs:`). Commit after every working step.
4. Before any feature that touches > 2 files: propose a plan first (plan mode), then build.
5. Prefer faking over blocking: if an SDK/API is not ready, build a mock behind the same interface in `lib/adapters/` and keep going. Mark it `// MOCK` and list it in `docs/PROGRESS.md`.
6. No new dependencies without saying why in one line.
7. Read vendor docs in `docs/vendor/` instead of guessing APIs. If the docs don't cover it, say so.
8. UI: follow `docs/DESIGN.md`. Touch targets ≥ 44px, text contrast ≥ 4.5:1, respect `prefers-reduced-motion`.

## Folder map
```
app/                 Next.js routes + UI            (Callie)
app/api/             server routes: llm, vexo, env  (Callie)
lib/adapters/        vexo.ts, llm.ts, location.ts, env.ts — real + mock impls
prompts/             companion persona + system prompts (Mapa)
docs/PLAN.md         timeline, roles, checkpoints
docs/PROGRESS.md     live status board — update every hour
docs/DEMO.md         2-minute demo script + backup plan
docs/DESIGN.md       visual direction + tokens
docs/vendor/         pasted SDK / API docs
.claude/agents/      subagents (see below)
```

## Subagents (in `.claude/agents/`)
- `sdk-scout` — reads vendor docs, returns the exact calls we need. Read-only.
- `ui-builder` — builds screens/components to `docs/DESIGN.md`.
- `integrator` — wires Vexo → LLM → haptic/UI loop; owns adapters + API routes.
- `demo-qa` — runs the build, walks the demo script, reports what breaks. Read-only + bash.
- `readme-writer` — drafts README from code + docs at the end.
Use them for independent work; keep the main session for decisions and merging.

## Commands
- `npm run dev` · `npm run build` · `npm run lint`
- Deploy: push to `main` → Vercel auto-deploys
