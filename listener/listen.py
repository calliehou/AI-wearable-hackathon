"""Band listener: tap the band to start an interaction, tap again to stop.

While recording, the band's sound goes to Deepgram, which splits it by voice. When you
stop, Claude names the speakers it can, writes a title, summary and follow-ups, and the
interaction is saved to data/interactions.json for the app.

    .venv/bin/python listener/listen.py                 band 24 on the USB cable (default)
    .venv/bin/python listener/listen.py --ble           band 24 over Bluetooth (double-tap it first)
    .venv/bin/python listener/listen.py --sim           pretend band playing the kit's sample voice
    .venv/bin/python listener/listen.py --say "0: Hi, I'm Sam\\n1: Hi Sam, I'm Priya"
                                                        typed conversation, no band, no Deepgram
"""
import argparse
import sys
import threading
import time

import config
import diarize                                   # also puts the kit's examples folder on the path
import store
import summarize

sys.path.insert(0, str(config.KIT / "python"))
from vexo_open.sync import Band, VexoError       # noqa: E402


def finish(started_at, turns, source):
    """Claude reads the conversation; the result is saved. Returns the saved item or None."""
    ended_at = store.now()
    if not turns:
        print("Nobody was heard, so nothing was saved.")
        return None
    print("\nClaude is reading the conversation...")
    reading = summarize.read_conversation(turns, store.known_people())
    item = store.save(started_at, ended_at, turns, reading, source)
    print("Saved: %s" % item["title"])
    print("  %s" % item["summary"])
    for p in item["people"]:
        who = p["name"] or "unknown"
        print("  Speaker %d: %s%s" % (p["speaker"], who, " (wearer)" if p["is_wearer"] else ""))
    return item


def typed(script):
    turns = diarize.turns_from_script(script)
    finish(store.now(), turns, "typed")


def record_once(band, seconds):
    """Mic on, stream to Deepgram with speaker labels, until `seconds` pass or stop is set."""
    ears = diarize.DiarizedSpeech().start(lambda text, final: print("  " + text) if final else None)
    band.on("audio", ears.feed)
    started_at = store.now()
    band.configure(audio=True, events=True)      # solid blue light: the microphone is on
    print("Recording. Tap the band to stop (stops by itself after %d s)." % seconds)
    return ears, started_at


def stop_recording(band, ears):
    band.configure(audio=False, events=True)
    band.off("audio", ears.feed)
    ears.stop()
    return diarize.turns_from_words(ears.words)


def run_band(transport, source):
    options = {}
    if transport == "sim":
        from vexo_open import audio
        voice = config.KIT / "dashboard" / "speech" / "sample-speech.opus"
        options["audio_packets"] = audio.ogg_packets(str(voice))
    band = Band.connect(config.BAND, transport, **options)
    print("Connected to %s." % band.name)

    tapped = threading.Event()
    band.on("tap", lambda e: tapped.set())
    band.configure(events=True)
    band.set_led(config.LED_IDLE)

    try:
        while band.connected:
            if transport == "sim":
                print("Pretend band: recording its sample voice for 16 seconds.")
            else:
                print("\nTap the band to start an interaction. Ctrl+C to quit.")
                while not tapped.wait(0.2):
                    if not band.connected:
                        return
            tapped.clear()

            ears, started_at = record_once(band, config.MAX_SECONDS)
            limit = 16 if transport == "sim" else config.MAX_SECONDS
            deadline = time.monotonic() + limit
            while time.monotonic() < deadline and band.connected:
                if transport != "sim" and tapped.wait(0.2):
                    break
                time.sleep(0.05 if transport != "sim" else 0.2)
            tapped.clear()
            turns = stop_recording(band, ears)

            band.set_led(config.LED_THINKING, pattern="blink", period=400)
            try:
                finish(started_at, turns, source)
                band.set_led(config.LED_SAVED)
            except RuntimeError as error:
                print("Problem: %s" % error)
                band.set_led(config.LED_ERROR)
            time.sleep(2)
            band.set_led(config.LED_IDLE)
            if transport == "sim":
                return
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        band.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Record interactions with Vexo band %d." % config.BAND)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--ble", action="store_true", help="Bluetooth instead of the USB cable")
    group.add_argument("--sim", action="store_true", help="pretend band with the kit's sample voice")
    group.add_argument("--say", metavar="SCRIPT", help='typed conversation, e.g. "0: Hi\\n1: Hello"')
    args = parser.parse_args()
    try:
        if args.say:
            typed(args.say)
        elif args.sim:
            run_band("sim", "sim")
        else:
            run_band("ble" if args.ble else "serial", "band-%d" % config.BAND)
    except (RuntimeError, VexoError) as error:
        print("Problem: %s" % getattr(error, "message", error))
        sys.exit(1)


if __name__ == "__main__":
    main()
