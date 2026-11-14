"""Who is speaking: assigns every word of one Deepgram stream to a voice, by voiceprint.

Words arrive from Deepgram with its own speaker label ("dg"), which often merges voices.
This tracker cuts the words into stretches (a new stretch at a pause or a Deepgram speaker
change), makes a voiceprint of each stretch from the band's sound, and gives it to the
closest known voice: a named person from data/voiceprints.json, or a voice heard earlier
in this stream. A stretch that matches nobody starts a new, unnamed voice.

Each word gets "speaker" = the voice id. Voice ids are numbers for this stream only;
names are what last.
"""
import threading
import time

import config
import voiceprints as vp

PAUSE = 0.7                    # seconds of pause that start a new stretch
SETTLE = 1.2                   # an open stretch is decided once this long has passed with no new words


class VoiceTracker:
    def __init__(self, log=print):
        self.log = log
        self.lock = threading.Lock()
        self.voices = {}                       # id -> {"name", "is_wearer", "enrolled": [vec], "heard": [vec]}
        self.next_id = 0
        self.dg_map = {}                       # Deepgram label -> voice id it was last matched to
        self.done = 0                          # words before this index have a voice
        self.last_voice = None
        self.segments = []                     # (first word index, last word index, voice id, vec or None)
        self.people_mtime = -1.0
        self.reload_people()

    # ---- named people from data/voiceprints.json

    def reload_people(self):
        mtime = vp.people_mtime()
        if mtime == self.people_mtime:
            return
        self.people_mtime = mtime
        people = vp.load_people()
        with self.lock:
            for name, vecs in people.items():
                vid = self._id_for_name(name)
                if vid is None:
                    vid = self._new_voice(name)
                self.voices[vid]["enrolled"] = vecs

    def _id_for_name(self, name):
        for vid, v in self.voices.items():
            if v["name"] and v["name"].lower() == name.lower():
                return vid
        return None

    def _new_voice(self, name=None):
        vid = self.next_id
        self.next_id += 1
        self.voices[vid] = {"name": name, "is_wearer": bool(name and name.lower() == config.WEARER.lower()),
                            "enrolled": [], "heard": []}
        return vid

    # ---- assigning words

    def match(self, vec):
        """Best voice for a voiceprint, or None if nobody is close enough."""
        best, best_sim = None, vp.MATCH
        for vid, v in self.voices.items():
            refs = v["enrolled"] + v["heard"][-15:]
            if not refs:
                continue
            sim = max(vp.similarity(vec, r) for r in refs)
            if sim > best_sim:
                best, best_sim = vid, sim
        return best

    def assign(self, words, pcm_at, final=False):
        """Give a voice to every settled word. pcm_at(start, end) -> the sound as bytes.
        final=True decides the open stretch too (the conversation is ending)."""
        with self.lock:
            i = self.done
            while i < len(words):
                j = i
                while (j + 1 < len(words) and words[j + 1]["dg"] == words[i]["dg"]
                       and words[j + 1]["start"] - words[j]["end"] < PAUSE):
                    j += 1
                closed = j + 1 < len(words) or final or (
                    words[j].get("arrived", 0) and time.time() - words[j]["arrived"] > SETTLE)
                if not closed:
                    break
                start, end = words[i]["start"], words[j]["end"]
                vec, vid = None, None
                if end - start >= vp.MIN_SECONDS:
                    pcm = pcm_at(start, end)
                    if pcm and len(pcm) >= int(vp.MIN_SECONDS * 16000) * 2:
                        try:
                            vec = vp.embed(pcm)
                        except Exception as error:              # keep going on a model problem
                            self.log("Voiceprint problem: %s" % error)
                if vec is not None:
                    vid = self.match(vec)
                    if vid is None:
                        vid = self._new_voice()
                    self.voices[vid]["heard"].append(vec)
                else:                                           # too short to recognise: best guess
                    vid = self.dg_map.get(words[i]["dg"], self.last_voice)
                    if vid is None:
                        vid = self._new_voice()
                self.dg_map[words[i]["dg"]] = vid
                self.last_voice = vid
                for k in range(i, j + 1):
                    words[k]["speaker"] = vid
                self.segments.append((i, j, vid, vec))
                i = j + 1
            self.done = i

    def provisional(self, dg):
        """A voice to show for words not decided yet."""
        return self.dg_map.get(dg, self.last_voice if self.last_voice is not None else -1)

    # ---- names

    def name(self, vid, name, learn=True):
        """Name a voice (from the Live page, the app or Claude). learn=True saves its voiceprints."""
        name = (name or "").strip() or None
        with self.lock:
            v = self.voices.get(vid)
            if v is None:
                return
            heard = list(v["heard"])
            other = self._id_for_name(name) if name else None
            if other is not None and other != vid:
                # Same person as a voice we already have: fold this one into it.
                self.voices[other]["heard"].extend(heard)
                v["heard"], v["name"] = [], name
                v["is_wearer"] = self.voices[other]["is_wearer"]
                self.voices[other]["merged"] = self.voices[other].get("merged", []) + [vid]
            else:
                v["name"] = name
                v["is_wearer"] = bool(name and name.lower() == config.WEARER.lower())
        if learn and heard:
            vp.forget_vectors(heard)            # in case they were saved under a wrong name
            if name:
                vp.remember(name, heard[-vp.KEEP:])
            self.people_mtime = -1.0            # reload enrolled prints on the next tick

    def snapshot(self):
        with self.lock:
            return {vid: {"name": v["name"], "is_wearer": v["is_wearer"]} for vid, v in self.voices.items()}

    def voiceprints_for(self, first, last):
        """Mean voiceprint of each voice over words first..last (for the saved interaction)."""
        with self.lock:
            per = {}
            for i, j, vid, vec in self.segments:
                if vec is not None and i >= first and j <= last:
                    per.setdefault(vid, []).append(vec)
        return {vid: vp.centroid(vecs) for vid, vecs in per.items()}
