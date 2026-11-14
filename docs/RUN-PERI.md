# Running Peri

Three parts, all in this repo:

| Part | Folder | Runs on | Command |
|---|---|---|---|
| Band listener | `listener/` | the computer the Vexo band is plugged into | `.venv/bin/python listener/listen.py` |
| Mac server (data + AI) | repo root | the same computer as the listener | `npm run dev` |
| Peri phone app | `mobile/` | any laptop, opened in Expo Go | `npx expo start` |

The band's data (conversations, voices, promises) lives in `data/` on the computer that runs
the listener and the server. It is never committed.

## Just look at the app (no setup)

On a phone with **Expo Go**, on the **same Wi-Fi** as the Mac running Expo, scan the QR code
that `npx expo start` prints there (or in Expo Go: *Enter URL manually* → `exp://<that Mac's IP>:8081`).

## Edit the app on your own laptop, with the band's real data

1. Get the code and install:
   ```bash
   git clone https://github.com/calliehou/AI-wearable-hackathon
   cd AI-wearable-hackathon
   git switch mapa/interactions        # until PR #1 is merged; then stay on main
   cd mobile && npm install
   ```
2. Find the IP of the Mac with the band (on that Mac: `ipconfig getifaddr en0`), and make sure
   its server is running (`npm run dev` there). Both laptops and your phone on the same Wi-Fi.
3. Start Expo pointing at that Mac's data:
   ```bash
   EXPO_PUBLIC_PERI_SERVER=http://<band Mac IP>:3000 npx expo start
   ```
4. Scan the QR code it prints with Expo Go. Edit files in `mobile/src/`; the phone reloads by itself.

No keys are needed on your laptop for this: the AI and speech services are called by the Mac
with the band.

## Run everything on your own laptop

Only needed if you plug in a band yourself.

1. `npm install` in the repo root and in `mobile/`.
2. Copy `.env.example` to `.env` and fill in the team's keys (Anthropic, Deepgram, ElevenLabs).
   Never commit `.env`.
3. Python for the listener:
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r listener/requirements.txt
   git clone https://github.com/VexoAI-Org/vexo-open-kit.git   # stays out of git
   ```
4. Set your band number in `listener/config.py` (`BAND = ...`) and your name (`WEARER = ...`).
5. Run the three commands from the table above, each in its own terminal.

## Working together

- `git pull` before you start; small commits; `git push` when something works.
- The app's code is in `mobile/src/app/` (one file per screen) and `mobile/src/components/`.
- The server's code is in `app/api/peri/` and `lib/`.
