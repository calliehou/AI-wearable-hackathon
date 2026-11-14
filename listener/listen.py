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
import json
import sys
import threading
import time
from datetime import datetime, timezone

import config
import diarize                                   # also puts the kit's examples folder on the path
import store
import summarize
import voiceprints
import voices

sys.path.insert(0, str(config.KIT / "python"))
from vexo_open.sync import Band, VexoError       # noqa: E402

save_lock = threading.Lock()                     # one Claude reading / file write at a time
workers = []                                     # Claude readings in progress


def log(text):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), text), flush=True)


def finish(started_at, ended_at, turns, source, tracker=None, prints=None, loudest_vid=None):
    """Claude reads the conversation; the result is saved. Runs on a background thread.
    tracker: who each voice is (by voiceprint). Claude gets it as a hint; names Claude finds
    for unnamed voices are kept for the rest of the stream. prints: voice id -> voiceprint,
    saved with the interaction so renaming someone in the app teaches their voice."""
    if not turns:
        return
    with save_lock:
        # 1. Check every voice against the contact memory (saved voices of named people).
        talk = {}
        for t in turns:
            talk[t["speaker"]] = talk.get(t["speaker"], 0.0) + (t["end"] - t["start"])
        memory = voiceprints.load_people()
        checks = {vid: voiceprints.verify((prints or {}).get(vid), secs, memory) for vid, secs in talk.items()}
        hints = tracker.snapshot() if tracker else {}
        for vid, chk in checks.items():
            had = hints.get(vid, {}).get("name")
            if (prints or {}).get(vid) is None:
                continue                                   # too short to check: keep what the stream said
            loudest = vid == loudest_vid
            if chk["verdict"] == "match" or (chk["verdict"] == "weak" and had == chk["name"]):
                name = chk["name"]
            elif loudest and (chk["name"] in (None, config.WEARER) or chk["verdict"] == "none"):
                name = config.WEARER                       # the loudest voice is the wearer's, unless it is clearly someone else
                chk["verdict"], chk["how"] = "loudest", "loudest voice (the band is on your wrist)"
            else:
                name = None                                # memory doesn't back that name up: leave it open
            if name != had:
                log("Voice %d: %s -> %s (memory: %s %.2f, next %s %.2f)" % (
                    vid + 1, had or "unknown", name or "unknown", chk["name"], chk["score"], chk["runner_up"], chk["runner_up_score"]))
            hints[vid] = {"name": name, "is_wearer": bool(name and name.lower() == config.WEARER.lower())
                          or (name is None and hints.get(vid, {}).get("is_wearer", False) and not had)}
            if tracker and name and name != had:
                tracker.name(vid, name, learn=False)       # fix the stream for later conversations
        try:
            reading = summarize.read_conversation(turns, store.known_people(), hints)
            if tracker:
                for p in reading["people"]:
                    before = hints.get(p["speaker"], {})
                    if p["name"] and not before.get("name"):
                        # Claude heard the name said: remember it for this stream, and learn the
                        # voice too unless it is only Claude's guess that this is the wearer.
                        tracker.name(p["speaker"], p["name"], learn=not p["is_wearer"])
        except RuntimeError as error:
            # Keep the words even when Claude fails, so nothing recorded is lost.
            snap = tracker.snapshot() if tracker else {}
            reading = {
                "title": "Unread conversation", "summary": "Claude could not read this one: %s" % error,
                "people": [{"speaker": s, "name": snap.get(s, {}).get("name"),
                            "is_wearer": snap.get(s, {}).get("is_wearer", False), "evidence": "Not read."}
                           for s in sorted({t["speaker"] for t in turns})],
                "topics": [], "follow_ups": []}
            log("Problem: %s (the transcript was saved anyway)" % error)
        for p in reading["people"]:
            vec = (prints or {}).get(p["speaker"])
            p["voiceprint"] = [round(float(x), 5) for x in vec] if vec is not None else None
            chk = checks.get(p["speaker"])
            if chk and vec is not None:
                p["match"] = dict(chk, seconds=round(talk.get(p["speaker"], 0), 1))
                if chk.get("how") and p["name"] == config.WEARER:
                    p["evidence"] = "You: %s." % chk["how"]
                elif p["name"] and chk["name"] == p["name"] and chk["verdict"] != "none":
                    p["evidence"] = "Recognised by voice: %.2f match%s." % (
                        chk["score"], " (next: %s %.2f)" % (chk["runner_up"], chk["runner_up_score"]) if chk["runner_up"] else "")
        item = store.save(started_at, ended_at, turns, reading, source)
        # 2. Contact memory grows: a clear match adds this conversation's sample to that person.
        for p in item["people"]:
            chk, vec = checks.get(p["speaker"]), (prints or {}).get(p["speaker"])
            if chk and vec is not None and p["name"] == chk["name"] and voiceprints.should_learn(chk, talk.get(p["speaker"], 0)):
                voiceprints.remember(p["name"], [vec])
                log("Learned more of %s's voice (%.2f match)." % (p["name"], chk["score"]))
        for pr in store.save_promises(item, reading.get("promises", [])):
            log("New promise: %s (to %s)" % (pr["title"], pr["person_name"] or "someone: name them in the app"))
        names = ", ".join(p["name"] or "Speaker %d" % (p["speaker"] + 1) for p in item["people"])
        log("Saved: %s  [%s]" % (item["title"], names))


def cut(words, wall_start):
    """Turn a slice of words into (started_at, ended_at, turns with times from 0)."""
    first, last = words[0]["start"], words[-1]["end"]
    started_at = datetime.fromtimestamp(wall_start + first, timezone.utc)
    ended_at = datetime.fromtimestamp(wall_start + last, timezone.utc)
    shifted = [dict(w, start=w["start"] - first, end=w["end"] - first) for w in words]
    return started_at, ended_at, diarize.turns_from_words(shifted)


def write_live(state):
    """data/live.json: what the app's Live page shows. Rewritten about twice a second."""
    config.LIVE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = config.LIVE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    tmp.replace(config.LIVE_FILE)


def read_name_requests():
    """Names typed on the Live page ("Name this voice"): data/live_names.jsonl, one per line."""
    path = config.LIVE_NAMES_FILE
    if not path.exists():
        return []
    taken = path.with_suffix(".taken")
    try:
        path.replace(taken)                      # take the file so nothing is read twice
        lines = taken.read_text(encoding="utf-8").splitlines()
        taken.unlink()
    except OSError:
        return []
    out = []
    for line in lines:
        try:
            req = json.loads(line)
            out.append((int(req["speaker"]), str(req.get("name") or "")[:60]))
        except (ValueError, KeyError, TypeError):
            pass
    return out


class Recorder:
    """Keeps one Deepgram stream open on the band's sound, decides who said each word by
    voiceprint, and cuts the stream into interactions."""

    def __init__(self, band, source, gap, longest):
        self.band, self.source, self.gap, self.longest = band, source, gap, longest
        self.ears = None
        self.tracker = None
        self.done_upto = 0                       # words before this index are already saved
        self.last_saved_at = None

    def open(self):
        from vexo_open.audio import PcmDecoder
        self.decoder = PcmDecoder()
        self.pcm = bytearray()                   # the band's sound, aligned with Deepgram's clock
        self.pcm_start = 0                       # sample number of pcm[0] since the stream began
        self.pcm_lock = threading.Lock()
        self.tracker = voices.VoiceTracker(log)  # a new stream: voices are matched afresh
        self.ears = diarize.DiarizedSpeech().start(lambda text, final: log("  " + text) if final else None)
        self.done_upto = 0
        self.band.on("audio", self.on_audio)

    def on_audio(self, packet):
        self.ears.feed(packet)
        # Decode without the packet counter so lost packets are not filled in: the sound then
        # keeps the same clock as the packets Deepgram received.
        pcm = self.decoder.feed(packet.opus if hasattr(packet, "opus") else packet)
        with self.pcm_lock:
            self.pcm.extend(pcm)

    def pcm_at(self, start, end):
        with self.pcm_lock:
            a = max(0, int(start * 16000) - self.pcm_start) * 2
            b = max(0, int(end * 16000) - self.pcm_start) * 2
            return bytes(self.pcm[a:b])

    def close(self):
        """Save what is pending and hang up Deepgram (the band keeps its microphone on)."""
        if not self.ears:
            return
        self.band.off("audio", self.on_audio)
        try:
            self.ears.stop(wait=3.0)
        except Exception:                        # a stream that already failed: keep its words
            pass
        self.flush()
        self.ears = None

    def flush(self):
        """Hand the words not yet saved to Claude, as one interaction."""
        words = self.ears.words
        self.tracker.assign(words, self.pcm_at, final=True)
        first, last = self.done_upto, len(words) - 1
        if last >= first:
            n = self.tracker.regroup(words, first, last)
            log("Voices in this conversation after regrouping: %d" % n)
        pending = words[first:]
        self.done_upto = len(words)
        if pending:
            started_at, ended_at, turns = cut(pending, self.ears.started_wall)
            prints = self.tracker.voiceprints_for(first, last)
            loudest_vid = self.tracker.loudest_for(first, last)
            worker = threading.Thread(target=finish, args=(started_at, ended_at, turns, self.source,
                                                           self.tracker, prints, loudest_vid), daemon=True)
            self.last_saved_at = time.time()
            workers.append(worker)
            worker.start()
            log("Conversation ended (%d turns): Claude is reading it while recording goes on." % len(turns))
            with self.pcm_lock:                  # the saved part's sound is no longer needed
                keep_from = int(pending[-1]["end"] * 16000)
                drop = max(0, keep_from - self.pcm_start)
                del self.pcm[:drop * 2]
                self.pcm_start += drop

    def live(self, connected=True):
        """Write the conversation in progress, split by voice, for the app's Live page."""
        snap = self.tracker.snapshot() if self.tracker else {}
        state = {"updated_at": time.time(), "band": config.BAND, "connected": connected,
                 "recording": bool(connected and self.ears), "wearer": config.WEARER,
                 "voices": {str(k): v for k, v in snap.items()},
                 "started_at": None, "turns": [], "interim": None,
                 "last_saved_at": self.last_saved_at, "silence_gap": self.gap}
        if self.ears:
            pending = [dict(w) for w in self.ears.words[self.done_upto:]]
            for w in pending:
                if w["speaker"] < 0:
                    w["speaker"] = self.tracker.provisional(w["dg"])
            if pending:
                started_at, _, turns = cut(pending, self.ears.started_wall)
                state["started_at"], state["turns"] = started_at.isoformat(), turns
            interim = list(self.ears.interim)
            if interim:
                state["interim"] = {"speaker": self.tracker.provisional(interim[0]["speaker"]),
                                    "text": " ".join(w["word"] for w in interim)}
        write_live(state)

    def check(self, tapped):
        """Called about twice a second: decide voices, take names typed on the Live page,
        end the conversation on silence, a tap or length."""
        self.tracker.reload_people()
        for vid, name in read_name_requests():
            log("Voice %d named %s on the Live page: learning this voice." % (vid + 1, name or "(no name)"))
            self.tracker.name(vid, name, learn=True)
        self.tracker.assign(self.ears.words, self.pcm_at)
        self.live()
        pending = self.ears.words[self.done_upto:]
        if not pending:
            return
        quiet = time.time() - (self.ears.last_word_at or time.time())
        length = pending[-1]["end"] - pending[0]["start"]
        if tapped or quiet >= self.gap or length >= self.longest:
            self.flush()


def read_paused():
    try:
        return bool(json.loads(config.CONTROL_FILE.read_text(encoding="utf-8")).get("paused"))
    except (OSError, ValueError):
        return False


def connect(transport):
    options = {}
    if transport == "sim":
        from vexo_open import audio
        options["audio_packets"] = audio.ogg_packets(str(config.KIT / "dashboard" / "speech" / "sample-speech.opus"))
    elif transport == "ble":
        options["auto_reconnect"] = True
    return Band.connect(config.BAND, transport, **options)


def run_always(transport, source, gap, longest, stop_after=None):
    log("Loading the voice model (recognises who is speaking; runs on this computer)...")
    voiceprints.load_model()
    known = sorted(voiceprints.load_people())
    log("Known voices: %s" % (", ".join(known) if known else "none yet. Name voices on the Live page."))
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
            paused = False
            while band.connected:
                time.sleep(0.5)
                # The Peri app's "Listening for promises" switch (data/control.json).
                want_pause = read_paused()
                if want_pause != paused:
                    paused = want_pause
                    if paused:
                        rec.flush()
                        band.configure(audio=False, events=True)
                        log("Paused from the Peri app: the band's microphone is off.")
                    else:
                        band.configure(audio=True, events=True)
                        log("Listening again.")
                if paused:
                    rec.live(connected=True)
                    continue
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
