"""Band listener, always on: the band records everything, non-stop.

The microphone stays on (solid blue light) for as long as this runs. The sound goes to
Deepgram, which splits it by voice. The stream is cut into interactions by silence: after
SILENCE_GAP seconds with no words, the conversation so far is handed to Claude, which names
the speakers it can and writes a title, summary and follow-ups, and it is saved to
data/interactions.json for the app. Recording never pauses while Claude works.

A tap on the band ends the current conversation right away (handy when you walk from one
person to the next). If the cable, the band or the internet drops, it reconnects and goes on.

    .venv/bin/python listener/listen.py                 band 24 on the USB cable (default)
    .venv/bin/python listener/listen.py --ble           band 24 over Bluetooth (double-tap it first)
    .venv/bin/python listener/listen.py --sim           pretend band playing the kit's sample voice
    .venv/bin/python listener/listen.py --say "0: Hi, I'm Sam\\n1: Hi Sam"
                                                        typed conversation, no band, no Deepgram
Options: --gap SECONDS (silence that ends a conversation), --max SECONDS (longest one).
"""
import argparse
import sys
import threading
import time
from datetime import datetime, timezone

import config
import diarize                                   # also puts the kit's examples folder on the path
import store
import summarize

sys.path.insert(0, str(config.KIT / "python"))
from vexo_open.sync import Band, VexoError       # noqa: E402

save_lock = threading.Lock()                     # one Claude reading / file write at a time
workers = []                                     # Claude readings in progress


def log(text):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), text), flush=True)


def finish(started_at, ended_at, turns, source, voices=None):
    """Claude reads the conversation; the result is saved. Runs on a background thread.
    voices: the Recorder's map of speaker number -> who that voice is, for this stream.
    Claude gets it as a hint, and what Claude finds is written back into it."""
    if not turns:
        return
    with save_lock:
        try:
            hints = dict(voices.snapshot()) if voices else {}
            reading = summarize.read_conversation(turns, store.known_people(), hints)
            if voices:
                voices.learn(reading["people"])
            item = store.save(started_at, ended_at, turns, reading, source)
        except RuntimeError as error:
            # Keep the words even when Claude fails, so nothing recorded is lost.
            item = store.save(started_at, ended_at, turns, {
                "title": "Unread conversation", "summary": "Claude could not read this one: %s" % error,
                "people": [{"speaker": s, "name": None, "is_wearer": False, "evidence": "Not read."}
                           for s in sorted({t["speaker"] for t in turns})],
                "topics": [], "follow_ups": []}, source)
            log("Problem: %s (the transcript was saved anyway)" % error)
        names = ", ".join(p["name"] or "Speaker %d" % (p["speaker"] + 1) for p in item["people"])
        log("Saved: %s  [%s]" % (item["title"], names))


def cut(words, wall_start):
    """Turn a slice of Deepgram words into (started_at, ended_at, turns with times from 0)."""
    first, last = words[0]["start"], words[-1]["end"]
    started_at = datetime.fromtimestamp(wall_start + first, timezone.utc)
    ended_at = datetime.fromtimestamp(wall_start + last, timezone.utc)
    shifted = [dict(w, start=w["start"] - first, end=w["end"] - first) for w in words]
    return started_at, ended_at, diarize.turns_from_words(shifted)


class Voices:
    """Who each Deepgram speaker number is, for one stream. Deepgram keeps the same number
    for the same voice for as long as the stream stays open, so once a voice is named
    (by Claude, or by being the wearer) that name follows it into every later conversation."""

    def __init__(self):
        self.lock = threading.Lock()
        self.people = {}                         # 1 -> {"name": "Sam", "is_wearer": False}

    def learn(self, people):
        with self.lock:
            for p in people:
                known = self.people.get(p["speaker"], {})
                self.people[p["speaker"]] = {
                    "name": p["name"] or known.get("name"),
                    "is_wearer": p["is_wearer"] or known.get("is_wearer", False),
                }

    def snapshot(self):
        with self.lock:
            return {k: dict(v) for k, v in self.people.items()}


def write_live(state):
    """data/live.json: what the app's Live page shows. Rewritten about twice a second."""
    import json
    config.LIVE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = config.LIVE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    tmp.replace(config.LIVE_FILE)


class Recorder:
    """Keeps one Deepgram stream open on the band's sound and cuts it into interactions."""

    def __init__(self, band, source, gap, longest):
        self.band, self.source, self.gap, self.longest = band, source, gap, longest
        self.ears = None
        self.done_upto = 0                       # words before this index are already saved
        self.voices = Voices()
        self.last_saved_at = None

    def open(self):
        self.ears = diarize.DiarizedSpeech().start(lambda text, final: log("  " + text) if final else None)
        self.done_upto = 0
        self.voices = Voices()                   # a new stream numbers the voices afresh
        self.band.on("audio", self.ears.feed)

    def close(self):
        """Save what is pending and hang up Deepgram (the band keeps its microphone on)."""
        if not self.ears:
            return
        self.band.off("audio", self.ears.feed)
        try:
            self.ears.stop(wait=3.0)
        except Exception:                        # a stream that already failed: keep its words
            pass
        self.flush()
        self.ears = None

    def flush(self):
        """Hand the words not yet saved to Claude, as one interaction."""
        words = self.ears.words[self.done_upto:]
        self.done_upto += len(words)
        if words:
            started_at, ended_at, turns = cut(words, self.ears.started_wall)
            worker = threading.Thread(target=finish, args=(started_at, ended_at, turns, self.source, self.voices),
                                      daemon=True)
            self.last_saved_at = time.time()
            workers.append(worker)
            worker.start()
            log("Conversation ended (%d turns): Claude is reading it while recording goes on." % len(turns))

    def live(self, connected=True):
        """Write the conversation in progress, split by voice, for the app's Live page."""
        state = {"updated_at": time.time(), "band": config.BAND, "connected": connected,
                 "recording": bool(connected and self.ears), "wearer": config.WEARER,
                 "voices": {str(k): v for k, v in self.voices.snapshot().items()},
                 "started_at": None, "turns": [], "interim": None,
                 "last_saved_at": self.last_saved_at, "silence_gap": self.gap}
        if self.ears:
            pending = self.ears.words[self.done_upto:]
            if pending:
                started_at, _, turns = cut(pending, self.ears.started_wall)
                state["started_at"], state["turns"] = started_at.isoformat(), turns
            interim = list(self.ears.interim)
            if interim:
                state["interim"] = {"speaker": interim[0]["speaker"], "text": " ".join(w["word"] for w in interim)}
        write_live(state)

    def check(self, tapped):
        """Called about twice a second: end the conversation on silence, a tap or length."""
        self.live()
        pending = self.ears.words[self.done_upto:]
        if not pending:
            return
        quiet = time.time() - (self.ears.last_word_at or time.time())
        length = pending[-1]["end"] - pending[0]["start"]
        if tapped or quiet >= self.gap or length >= self.longest:
            self.flush()


def connect(transport):
    options = {}
    if transport == "sim":
        from vexo_open import audio
        options["audio_packets"] = audio.ogg_packets(str(config.KIT / "dashboard" / "speech" / "sample-speech.opus"))
    elif transport == "ble":
        options["auto_reconnect"] = True
    return Band.connect(config.BAND, transport, **options)


def run_always(transport, source, gap, longest, stop_after=None):
    began = time.monotonic()
    while True:                                  # reconnect forever if the band goes away
        try:
            band = connect(transport)
        except VexoError as error:
            log("Could not reach band %d: %s Trying again in 5 s." % (config.BAND, error.message))
            time.sleep(5)
            continue
        log("Connected to %s. Recording everything, non-stop. Ctrl+C to quit." % band.name)
        log("Note: everything the band hears is sent to Deepgram, and the text to Claude. "
            "Tell the people near you.")
        tapped = threading.Event()
        band.on("tap", lambda e: tapped.set())
        rec = Recorder(band, source, gap, longest)
        try:
            rec.open()
            band.configure(audio=True, events=True)          # solid blue: the microphone is on
            while band.connected:
                time.sleep(0.5)
                if rec.ears.closed:                          # Deepgram hung up: open a new stream
                    log("The speech service disconnected; reconnecting (nothing said so far is lost).")
                    rec.close()
                    rec.open()
                rec.check(tapped.is_set())
                if tapped.is_set():
                    tapped.clear()
                if stop_after and time.monotonic() - began > stop_after:
                    raise KeyboardInterrupt
            log("The band disconnected. Reconnecting...")
            rec.close()
            rec.live(connected=False)
        except KeyboardInterrupt:
            log("Stopping: saving the last conversation...")
            rec.close()
            try:
                band.configure(audio=False)
            except VexoError:
                pass
            band.disconnect()
            for worker in workers:                           # wait for Claude to finish
                worker.join(timeout=120)
            rec.live(connected=False)
            log("Stopped.")
            return
        except Exception as error:                           # keep going whatever happens
            log("Problem: %s. Restarting in 5 s." % getattr(error, "message", error))
            try:
                rec.close()
                band.disconnect()
            except Exception:
                pass
            time.sleep(5)


def main():
    parser = argparse.ArgumentParser(description="Record everything band %d hears, non-stop." % config.BAND)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--ble", action="store_true", help="Bluetooth instead of the USB cable")
    group.add_argument("--sim", action="store_true", help="pretend band with the kit's sample voice")
    group.add_argument("--say", metavar="SCRIPT", help='typed conversation, e.g. "0: Hi\\n1: Hello"')
    parser.add_argument("--gap", type=float, default=config.SILENCE_GAP, help="seconds of silence that end a conversation")
    parser.add_argument("--max", type=float, default=config.MAX_INTERACTION, help="longest conversation, in seconds")
    parser.add_argument("--stop-after", type=float, help=argparse.SUPPRESS)   # for tests
    args = parser.parse_args()
    if args.say:
        now = store.now()
        finish(now, now, diarize.turns_from_script(args.say), "typed")
    elif args.sim:
        run_always("sim", "sim", args.gap, args.max, args.stop_after)
    else:
        run_always("ble" if args.ble else "serial", "band-%d" % config.BAND, args.gap, args.max, args.stop_after)


if __name__ == "__main__":
    main()
