# Running Peri

Three parts, all in this repo:

| Part | Folder | Runs on | Command |
|---|---|---|---|
| Band listener | `listener/` | the computer near the band (Bluetooth) or plugged into it (USB) | `.venv/bin/python listener/listen.py --ble` |
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
3. Run the listener in a third terminal, in the repo root:
   - **Bluetooth (no cable):** `.venv/bin/python listener/listen.py --ble`, then **double-tap the band**
     (its light blinks blue for 60 s while it can be found). Keep the band within about one room of the Mac.
   - **USB cable:** `.venv/bin/python listener/listen.py` (use a cable that carries data, not only power).
   - **No band:** `.venv/bin/python listener/listen.py --sim` (a pretend band reading a sample text).

   The listener retries every 5 s until it reaches the band. When it connects, the band flashes white,
   then its light stays solid blue: the microphone is on. Tell the people near you.
   Watch the conversation live at <http://localhost:3000/live>.

### Using the band
- **Double-tap** while connected ends the current conversation (it's also cut after 30 s of silence).
- **Pause** listening from the app's Band screen.
- Only one program can be connected to the band: close the Vexo dashboard tab first.

## Troubleshooting

| You see | Why, and what to do |
|---|---|
| App: "Not connected to your band" | Usually the **phone can't reach the Mac**, not the band. On the phone, open `http://<Mac IP>:3000/live` in Safari. If it doesn't load, see the next row. |
| The phone can't open the Mac's page on the same Wi-Fi | Event and campus Wi-Fi often blocks devices from talking to each other. Turn on the iPhone's **Personal Hotspot**, join it from the Mac (Wi-Fi menu, or USB cable with the Mac's Wi-Fi off), then restart `npx expo start` so it picks up the Mac's new address. Also check Settings → Privacy & Security → Local Network → Expo Go is on. |
| Listener: "No band found on USB" | The band isn't plugged in, the cable only charges, the battery is flat, or macOS is waiting for "Allow accessory to connect?". Or use `--ble`. |
| Listener: "Could not see Vexo-HACK-…" | Double-tap the band (blue blink), keep it close, and close anything else connected to it. |
| Listener: "Bluetooth device is turned off" while Bluetooth is on | macOS hasn't allowed Bluetooth for the app running the listener: System Settings → Privacy & Security → Bluetooth. The listener keeps retrying. |
| Live page: "Listener not running" | The listener isn't connected to a band yet. Check its terminal. |

## Working together

- `git pull` before you start; small commits; `git push` when something works.
- The app's code is in `mobile/src/app/` (one file per screen) and `mobile/src/components/`.
- The server's code is in `app/api/peri/` and `lib/`.
