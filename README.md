# peri

**Peri hears the promises you make and helps you keep them, so the people you care about stay in your orbit.**

[TODO: demo video] · No public URL: Peri runs on the wearer's Mac and phone (see [Run Peri](docs/RUN-PERI.md)).

## The problem
We make small promises all day: "I'll pay you back," "I'll send the deck Monday," "Your birthday's Saturday, right?" They're spoken, not typed, so they slip. Friendships drift one forgotten promise at a time.

## What Peri does
- **Hears promises.** A Vexo Band listens all day and catches commitments in conversation, including shared plans ("we should go to Hawaii") and promises to people who aren't there ("I need to get Mom a present"). You can also hold the mic and tell Peri directly. A new promise reaches the app in a few seconds.
- **Knows who's talking.** Peri learns each person's voice and recognises them in later conversations. A voice it doesn't know shows up under **Who is this?**, so you can name it once or pick the person from your phone contacts.
- **Sorts them.** Each promise is filed under the right person as money, gift, task or plan, with the day and time if you said one. You can edit all of it.
- **Shows your orbit.** You sit at the center and your people orbit you. Whoever needs you soonest sits closest, and the badges show open promises. Home lists them as **Due today**, **This week** and **Later**. Drag to reorder, swipe to delete, and tick one done to watch it pop.
- **Helps you keep them.**
  - **Get ideas from Peri** on any promise: sandwich recipes, a Hawaii plan, soccer gifts.
  - **Ask Peri**, a chat that answers questions and fixes promises ("make Leo's due Thursday").
  - Gentle nudges when someone drifts.
  - Phone reminders.
  - A Venmo hand-off for money you owe.
- **Remembers people.**
  - Each person has a short recap: your last talk, what's still open, a fun fact. Peri can read it aloud.
  - Each person also has a one-line activity log.
  - You can rename people, merge duplicates ("Callie" and "Callie Hou"), choose their orbit and circles, and see open and kept promises.

## Why it's called Peri
From *perigee*, the point where an orbit comes closest. Keeping your promises keeps people close.

## How it works
```
Vexo Band ──Bluetooth or USB──▶ Mac: listener (Python)
                                 ├─ Deepgram: speech → text, split by speaker
                                 ├─ SpeechBrain voiceprints: who is speaking (runs on the Mac)
                                 └─ Claude: promises, person, kind, due date, summary
                                        │
                                        ▼
                                 data/ on the Mac (never committed)
                                        │
                                 Mac server (Next.js): /api/peri, Ask Peri, recaps (ElevenLabs voice)
                                        │  Wi-Fi
                                        ▼
                                 Peri phone app (Expo): your orbit, promises, people
```
The Mac also serves a **Live** page (`localhost:3000/live`) with the conversation as it happens, split by speaker.

## Privacy
- **Audio isn't saved.** No recordings are kept: sound is streamed to Deepgram for speech-to-text and not stored by Peri.
- **Transcripts are kept on the Mac.** The text of each conversation stays on the wearer's Mac (`data/`) and is never committed. The text and promises go to Claude. Recaps are voiced by ElevenLabs.
- **Tell people.** The band's solid blue light means the microphone is on. Tell the people near you, and pause listening from the app's Band screen whenever someone asks.
- **Voiceprints stay local.** They are numbers describing how each named person sounds, and they stay on the Mac.
- **Money never moves inside Peri.** It opens Venmo with the amount filled in, and you approve the payment there.

## Tech
- **Phone app:** Expo (React Native) · TypeScript · Expo Router.
- **Mac server:** Next.js.
- **Band listener:** Python with the Vexo Open Kit (Bluetooth or USB).
- **Services:**
  - Claude API (promises, recaps, Ask Peri, ideas)
  - Deepgram (speech-to-text with speaker labels)
  - SpeechBrain ECAPA (voice recognition on the Mac)
  - ElevenLabs (spoken recaps)

## Run locally
Peri has three parts: the band listener, the Mac server and the phone app. Full steps are in **[docs/RUN-PERI.md](docs/RUN-PERI.md)**. In short:
```bash
git clone https://github.com/calliehou/AI-wearable-hackathon
cd AI-wearable-hackathon
npm install && (cd mobile && npm install)
cp .env.example .env                          # add your Anthropic, Deepgram and ElevenLabs keys
npm run dev                                   # Mac server, terminal 1
(cd mobile && npx expo start)                 # phone app, terminal 2: scan the QR code with Expo Go
.venv/bin/python listener/listen.py --ble     # band listener, terminal 3 (see RUN-PERI for setup)
```

## Current limitations
- **Mac in range:** the Mac has to stay within Bluetooth range of the band, about one room. Going out of range pauses listening until you're back.
- **Wi-Fi:** the phone talks to the Mac over Wi-Fi. Event and campus networks often block devices from reaching each other, and the iPhone's Personal Hotspot fixes that.
- **Reminders:** the band can't vibrate, so reminders and "promise heard" alerts come from the phone. In Expo Go they only arrive while the app is open.
- **Voice recognition:** it improves as Peri hears each person more. A new voice may need naming once.
- **Payments:** Venmo hand-off only, with no in-app transfers.
- **One wearer:** there is one wearer per Mac, set in `listener/config.py`.

## Team
**Callie Hou** (design engineering & prototype) · **Mapa** (strategy & data)

Built at VexoHacks · Y Combinator · San Francisco · November 2026
