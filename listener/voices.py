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
LOUDNESS_APART = 6.0           # dB: voices this far apart in volume are not merged
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
        self.segments = []                     # [first word, last word, voice id, voiceprint or None, loudness dB, seconds]
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

    def _scores(self, vec, only=None):
        """Similarity of vec to each voice's average (named people: also their saved voice)."""
        out = {}
        for vid, v in self.voices.items():
            if v.get("merged_into") is not None or (only is not None and vid not in only):
                continue
            sims = []
            if v["enrolled"]:
                sims.append(vp.similarity(vec, vp.centroid(v["enrolled"])))
            if v["heard"]:
                sims.append(vp.similarity(vec, vp.centroid(v["heard"][-20:])))
            if sims:
                out[vid] = max(sims)
        return out

    def match(self, vec):
        """Best voice for a voiceprint, or None if nobody is close enough or it is a toss-up."""
        scores = sorted(self._scores(vec).items(), key=lambda kv: -kv[1])
        if not scores:
            return None
        best, best_sim = scores[0]
        second = scores[1][1] if len(scores) > 1 else -1.0
        need = vp.MATCH_NAMED if self.voices[best]["name"] and not self.voices[best]["heard"] else vp.MATCH
        if best_sim >= need and (best_sim - second >= vp.MARGIN or best_sim >= need + 0.15):
            return best
        if best_sim >= vp.MATCH:                 # close to two voices: keep the best, don't invent a third
            return best
        return None

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
                vec, vid, db = None, None, None
                pcm = pcm_at(start, end)
                if pcm:
                    db = vp.loudness_db(pcm)
                long_enough = end - start >= vp.MIN_SECONDS
                if end - start >= vp.SHORT_SECONDS and pcm and len(pcm) >= int(vp.SHORT_SECONDS * 16000) * 2:
                    try:
                        vec = vp.embed(pcm)
                    except Exception as error:              # keep going on a model problem
                        self.log("Voiceprint problem: %s" % error)
                if vec is not None:
                    vid = self.match(vec)
                    if vid is None and not long_enough:     # short: the nearest known voice, if any
                        scores = self._scores(vec)
                        vid = max(scores, key=scores.get) if scores else None
                    if vid is None:
                        vid = self._new_voice()
                    if long_enough:
                        self.voices[vid]["heard"].append(vec)
                if vid is None:                                 # too short to recognise: best guess
                    vid = self.dg_map.get(words[i]["dg"], self.last_voice)
                    if vid is None:
                        vid = self._new_voice()
                vid = self._live(vid)
                self.dg_map[words[i]["dg"]] = vid
                self.last_voice = vid
                for k in range(i, j + 1):
                    words[k]["speaker"] = vid
                self.segments.append([i, j, vid, vec, db, end - start])
                i = j + 1
            self.done = i

    def _live(self, vid):
        """Follow merges: the voice a merged-away voice now belongs to."""
        while self.voices[vid].get("merged_into") is not None:
            vid = self.voices[vid]["merged_into"]
        return vid

    def regroup(self, words, first, last):
        """When a conversation ends: fold voices with too little speech into the nearest real
        voice, merge real voices that sound alike, and spot the wearer by loudness. Rewrites
        the speaker of words first..last. Returns the number of voices left."""
        with self.lock:
            segs = [sg for sg in self.segments if sg[0] >= first and sg[1] <= last]
            if not segs:
                return 0
            for sg in segs:
                sg[2] = self._live(sg[2])
            talk, vecs, loud = {}, {}, {}
            for _, _, vid, vec, db, dur in segs:
                talk[vid] = talk.get(vid, 0.0) + dur
                if vec is not None:
                    vecs.setdefault(vid, []).append(vec)
                if db is not None:
                    a, w = loud.get(vid, (0.0, 0.0))
                    loud[vid] = (a + db * dur, w + dur)

            def cen(vid):
                v = self.voices[vid]
                return vp.centroid(vecs.get(vid, []) + v["enrolled"][-10:])

            named = [vid for vid in talk if self.voices[vid]["name"]]
            big = [vid for vid in talk if vid in named or (talk[vid] >= vp.SUBSTANTIAL and vid in vecs)]
            if not big:                              # nobody spoke long enough: keep the longest talker
                big = [max(talk, key=talk.get)]
            target = {vid: vid for vid in talk}

            def group_db(g):
                a = sum(loud[v][0] for v in g if v in loud)
                w = sum(loud[v][1] for v in g if v in loud)
                return a / w if w else None

            # 1. Merge real voices that sound alike (two named people are never merged).
            groups = [[vid] for vid in big]
            while True:
                best, pair = vp.MERGE, None
                for x in range(len(groups)):
                    for y in range(x + 1, len(groups)):
                        if sum(1 for g in groups[x] + groups[y] if g in named) > 1:
                            continue
                        lx, ly = group_db(groups[x]), group_db(groups[y])
                        if lx is not None and ly is not None and abs(lx - ly) >= LOUDNESS_APART:
                            continue                 # one near the band, one far: different people
                        cx = vp.centroid([c for g in groups[x] if (c := cen(g)) is not None])
                        cy = vp.centroid([c for g in groups[y] if (c := cen(g)) is not None])
                        if cx is None or cy is None:
                            continue
                        sim = vp.similarity(cx, cy)
                        if sim > best:
                            best, pair = sim, (x, y)
                if pair is None:
                    break
                x, y = pair
                groups[x] += groups.pop(y)
            for g in groups:
                keep = next((v for v in g if v in named), max(g, key=lambda v: talk[v]))
                for v in g:
                    target[v] = keep

            # 2. Voices with too little speech go to the closest real voice (or stay with their neighbour).
            heads = sorted(set(target[v] for v in big))
            for vid in talk:
                if vid in big:
                    continue
                if vid in vecs:
                    c = vp.centroid(vecs[vid])
                    target[vid] = max(heads, key=lambda h: vp.similarity(c, cen(h)) if cen(h) is not None else -1)
                else:
                    target[vid] = None               # decided below from the neighbouring stretch
            prev = None
            for sg in segs:
                t = target[sg[2]] if target[sg[2]] is not None else prev
                if t is None:
                    t = heads[0]
                prev = t
                for k in range(sg[0], sg[1] + 1):
                    words[k]["speaker"] = t
                if sg[2] != t:
                    old = self.voices[sg[2]]
                    if sg[3] is not None and any(h is sg[3] for h in old["heard"]):
                        old["heard"] = [h for h in old["heard"] if h is not sg[3]]
                        self.voices[t]["heard"].append(sg[3])
                    if not old["name"] and not old["heard"]:
                        old["merged_into"] = t
                    sg[2] = t
            for d, v in list(self.dg_map.items()):
                self.dg_map[d] = self._live(v)
            if self.last_voice is not None:
                self.last_voice = self._live(self.last_voice)

            # 3. Re-check every stretch against the final voices (their averages over this whole
            #    conversation), twice: the first guesses were made with little to compare against.
            for _ in range(2):
                heads = sorted(set(sg[2] for sg in segs))
                if len(heads) < 2:
                    break
                cents = {}
                for h in heads:
                    hv = [sg[3] for sg in segs if sg[2] == h and sg[3] is not None]
                    hv += self.voices[h]["enrolled"][-10:]
                    cents[h] = vp.centroid(hv)
                prev = None
                for sg in segs:
                    if sg[3] is not None:
                        best = max((h for h in heads if cents[h] is not None),
                                   key=lambda h: vp.similarity(sg[3], cents[h]), default=sg[2])
                    else:
                        best = prev if prev is not None else sg[2]   # under a second: same as the stretch before
                    prev = best
                    if best != sg[2]:
                        sg[2] = best
                        for k in range(sg[0], sg[1] + 1):
                            words[k]["speaker"] = best

            # 4. The wearer: the band is on their wrist, so theirs is the loudest voice.
            left = sorted(set(sg[2] for sg in segs))
            if not any(self.voices[v]["is_wearer"] for v in left):
                lv = {}
                for sg in segs:
                    if sg[4] is not None:
                        a, w = lv.get(sg[2], (0.0, 0.0))
                        lv[sg[2]] = (a + sg[4] * sg[5], w + sg[5])
                avg = sorted(((a / w, v) for v, (a, w) in lv.items() if w > 0), reverse=True)
                if avg and (len(avg) == 1 or avg[0][0] - avg[1][0] >= 3.0):
                    self.voices[avg[0][1]]["likely_wearer"] = True
            return len(left)

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
            return {vid: {"name": v["name"] or (config.WEARER if v.get("likely_wearer") and not self._wearer_named() else None),
                          "is_wearer": v["is_wearer"] or (bool(v.get("likely_wearer")) and not self._wearer_named())}
                    for vid, v in self.voices.items() if v.get("merged_into") is None}

    def _wearer_named(self):
        return any(v["is_wearer"] for v in self.voices.values())

    def loudest_for(self, first, last, apart=3.0):
        """The voice that is clearly loudest over words first..last (the wearer's, since the
        band is on their wrist), or None if no voice stands out by `apart` dB."""
        with self.lock:
            lv = {}
            for i, j, vid, _vec, db, dur in self.segments:
                if i >= first and j <= last and db is not None:
                    a, w = lv.get(vid, (0.0, 0.0))
                    lv[vid] = (a + db * dur, w + dur)
        avg = sorted(((a / w, v) for v, (a, w) in lv.items() if w > 0), reverse=True)
        if not avg:
            return None
        if len(avg) == 1 or avg[0][0] - avg[1][0] >= apart:
            return avg[0][1]
        return None

    def voiceprints_for(self, first, last):
        """Mean voiceprint of each voice over words first..last (for the saved interaction)."""
        with self.lock:
            per = {}
            for i, j, vid, vec, _db, _dur in self.segments:
                if vec is not None and i >= first and j <= last:
                    per.setdefault(vid, []).append(vec)
        return {vid: vp.centroid(vecs) for vid, vecs in per.items()}
