# How Callie × Mapa collaborate on GitHub

## 0. One-time setup (10 min, do first)

```bash
# Callie: add Mapa as collaborator
gh repo edit calliehou/AI-wearable-hackathon --visibility public   # if submission needs public
# GitHub → Settings → Collaborators → add Mapa (Write)

# Both:
git clone https://github.com/calliehou/AI-wearable-hackathon
cd AI-wearable-hackathon
```

Drop this framework into the repo root, then:

```bash
mkdir -p .claude/agents && mv claude-agents/*.md .claude/agents/ && rmdir claude-agents
# create .claude/settings.json from the block below
git add -A && git commit -m "chore: hackathon framework" && git push
```

`.claude/settings.json`:
```json
{
  "permissions": {
    "deny": ["Read(./.env)", "Read(./.env.*)", "Read(./**/.env)", "Read(./**/.env.*)"],
    "allow": ["Bash(npm run dev)", "Bash(npm run build)", "Bash(npm run lint)",
              "Bash(git status)", "Bash(git diff:*)", "Bash(git log:*)",
              "Bash(git add:*)", "Bash(git commit:*)"]
  }
}
```

`.gitignore` must include: `.env*` and `!.env.example`, plus `node_modules`, `.next`, `.vercel`.

## 1. Branches

| Branch | Who | What |
|---|---|---|
| `main` | both | Always demo-able. Vercel production deploy. |
| `callie/core` | Callie (worktree 1) | adapters, API routes, Vexo integration |
| `callie/ui` | Callie (worktree 2) | screens, components |
| `mapa/docs` | Mapa | `docs/`, `prompts/`, README narrative |

Because you own different folders, conflicts should be rare. Rule: **pull before you start, push when it works.**

```bash
git pull --rebase origin main          # before starting anything
git add -A && git commit -m "feat: ..." && git push
gh pr create --fill --base main        # or merge directly if build passes
```

Fast path during the hackathon: small PRs, and the other person approves in < 2 min. Or skip PRs for `docs/` and `prompts/`.

## 2. Tracking work

- **GitHub Issues** = task list. Labels: `P0` `P1` `P2` `callie` `mapa` `blocked`.
- Create the first issues at T+0:30 straight from the demo script, one per demo step:
  ```bash
  gh issue create -t "P0: band transcript shows on screen" -l P0,callie
  gh issue create -t "P0: companion persona prompt v1" -l P0,mapa
  ```
- Close issues from commits: `git commit -m "feat: live transcript (closes #3)"`.
- `docs/PROGRESS.md` is updated at every hourly sync. It's the at-a-glance board, and it also feeds the README.

## 3. Claude Code: who runs what

| Session | Machine | Branch | Main subagents |
|---|---|---|---|
| Core | Callie | `callie/core` (worktree) | `integrator`, `sdk-scout` |
| UI | Callie | `callie/ui` (worktree) | `ui-builder` |
| Story | Mapa | `mapa/docs` | `readme-writer`, plus plain chat for deck and prompts |
| Checks | either | `main` | `demo-qa` at T+3:00, T+4:30, before submit |

Prompts that work well:
- "Use the sdk-scout agent to find how to stream transcripts from the Vexo Band. Then plan the adapter in plan mode."
- "Use ui-builder to build the home screen per docs/DESIGN.md using the mock adapter."
- "Run demo-qa and give me only the P0 issues."

## 4. Secrets

- Keys arrive at kickoff → put them in a password manager or AirDrop them. **Never** put them in Slack, issues, commits or `CLAUDE.md`.
- Each person keeps their own `.env.local`. Vercel gets the same names in Project Settings.
- Before submitting: `git log -p | grep -iE "sk-|api_key"` should return nothing. Rotate any key that leaked.
