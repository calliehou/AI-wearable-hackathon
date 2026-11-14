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

## Run Peri on your own laptop, with your own data

1. `npm install` in the repo root and in `mobile/`.
2. Copy `.env.example` to `.env` and fill in the team's keys (Anthropic, Deepgram, ElevenLabs).
   Never commit `.env`.
3. In one terminal, in the repo root: `npm run dev`
4. In another, in `mobile/`: `npx expo start`, then scan its QR code with Expo Go (phone on the
   same Wi-Fi as the laptop).

The app starts empty. Without a band you can still add promises with the mic button (hold and
speak, or "Type it instead") and use Ask Peri, gift ideas, circles and the rest.

### Optional: a band (or the pretend band) on your laptop

1. Python for the listener:
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r listener/requirements.txt
   git clone https://github.com/VexoAI-Org/vexo-open-kit.git   # stays out of git
   ```
2. Set your band number in `listener/config.py` (`BAND = ...`) and your name (`WEARER = ...`).
3. Run the listener in a third terminal: `.venv/bin/python listener/listen.py` (band on USB), or
   `.venv/bin/python listener/listen.py --sim` (no band: a pretend band reading a sample text).

## Working together

- `git pull` before you start; small commits; `git push` when something works.
- The app's code is in `mobile/src/app/` (one file per screen) and `mobile/src/components/`.
- The server's code is in `app/api/peri/` and `lib/`.
