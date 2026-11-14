# peri

**Peri hears the promises you make and helps you keep them, so the people you care about stay in your orbit.**

[TODO: demo video] · [TODO: live URL]

## The problem
We make small promises all day: "I'll pay you back," "I'll send the deck Monday," "Your birthday's Saturday, right?" They're spoken, not typed, so they slip. Friendships drift one forgotten promise at a time.

## What Peri does
- **Hears promises.** A Vexo Band catches commitments in conversation; you can also hold the mic and tell Peri directly.
- **Sorts them.** Each promise is filed under the right person as money, gift, task or plan.
- **Shows your orbit.** You sit at the center and your people orbit you. Whoever needs you soonest sits closest, and the badges show open promises.
- **Helps you keep them.** Due-today cards, gentle nudges when someone drifts, gift ideas from things they've mentioned, and a one-tap transfer for money you owe.
- **Remembers people.** Each person has a recent-activity log and an "About" card with key facts.

## Why it's called Peri
From *perigee*, the point where an orbit comes closest. Keeping your promises keeps people close.

## How it works
Vexo Band / mic → speech-to-text → Claude extracts promises, the person, the kind and the due date → you confirm → your orbit updates.
[TODO: architecture diagram]

## Privacy
Audio is never stored. Other people's words are summarized, never quoted. Money never moves without your approval.

## Tech
Next.js · TypeScript · Tailwind · Claude API · Vexo SDK · Vercel

## Run locally
```bash
git clone https://github.com/calliehou/AI-wearable-hackathon
cd AI-wearable-hackathon
npm install
cp .env.example .env.local   # ADAPTER_MODE=mock runs without the band
npm run dev
```

## Current limitations
- Payments are mocked in this build.
- [TODO]

## Team
**Callie Hou** (design engineering & prototype) · **Mapa** (strategy & data)

Built at VexoHacks · Y Combinator · San Francisco · November 2026
