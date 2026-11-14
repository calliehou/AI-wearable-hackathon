"""Voiceprints: recognise who is speaking from the sound of their voice.

Deepgram's speaker labels often merge two voices heard through the band's small microphone.
So the listener decides who spoke itself: each stretch of speech is turned into a voiceprint
(192 numbers, by the SpeechBrain ECAPA model, running on this computer: no sound leaves it
for this) and compared with the voiceprints of people already named.

    data/voiceprints.json   {"Mapa": [[192 numbers], ...], "Callie": [...]}   (gitignored)

A person is learnt when they are named: in the Live page ("Name this voice"), when an
interaction is renamed in the app, or when Claude finds a name in the conversation.
"""
import json
import os
import threading

import numpy as np

import config

MODEL_SOURCE = "speechbrain/spkrec-ecapa-voxceleb"
MODEL_DIR = os.path.expanduser("~/.cache/vexo-voiceprints/ecapa")
MIN_SECONDS = 2.0              # a stretch this long may start a new voice
SHORT_SECONDS = 1.0            # stretches from this long are matched to a known voice (never start one)
# Through the band's mic the same person scores ~0.35-0.6 and stretches under 2 s are noise
# (measured on our own recordings, 14 Nov 2026); clean audio scores ~0.9.
MATCH = 0.40                   # similarity to a voice's average needed to say "same person"
MERGE = 0.45                   # two voices in one conversation are merged only above this (Mapa vs Callie: 0.34)
MATCH_NAMED = 0.40             # ...to a named person's saved voice
MARGIN = 0.05                  # and it must beat the second-best voice by this much
SUBSTANTIAL = 4.0              # seconds of speech before a voice counts as its own person
KEEP = 40                      # voiceprints kept per person (newest)

_model = None
_model_lock = threading.Lock()
_file_lock = threading.Lock()


def load_model():
    """Loads the model once (a few seconds; the first time it is downloaded, ~80 MB)."""
    global _model
    with _model_lock:
        if _model is None:
            import warnings
            warnings.filterwarnings("ignore")
            from speechbrain.inference.speaker import EncoderClassifier
            _model = EncoderClassifier.from_hparams(source=MODEL_SOURCE, savedir=MODEL_DIR,
                                                    run_opts={"device": "cpu"})
    return _model


def embed(pcm: bytes):
    """16 kHz mono 16-bit samples -> a unit-length voiceprint (numpy, 192 numbers)."""
    import torch
    samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    with torch.no_grad():
        vec = load_model().encode_batch(torch.from_numpy(samples).unsqueeze(0)).squeeze().numpy()
    return vec / (np.linalg.norm(vec) + 1e-9)


def similarity(a, b) -> float:
    return float(np.dot(a, b))


# ---- the saved voiceprints of named people

def load_people():
    """{"Mapa": [np.array, ...]}"""
    path = config.VOICEPRINTS_FILE
    if not path.exists():
        return {}
    with _file_lock:
        raw = json.loads(path.read_text(encoding="utf-8"))
    return {name: [np.array(v, dtype=np.float32) for v in vecs] for name, vecs in raw.items() if vecs}


def people_mtime():
    try:
        return config.VOICEPRINTS_FILE.stat().st_mtime
    except FileNotFoundError:
        return 0.0


def remember(name, vectors):
    """Add voiceprints for a person (and drop the oldest beyond KEEP)."""
    name = (name or "").strip()
    vectors = [v for v in vectors if v is not None]
    if not name or not vectors:
        return
    path = config.VOICEPRINTS_FILE
    with _file_lock:
        raw = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        raw.setdefault(name, []).extend([[round(float(x), 5) for x in v] for v in vectors])
        raw[name] = raw[name][-KEEP:]
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(raw), encoding="utf-8")
        tmp.replace(path)


def forget_vectors(vectors):
    """Remove these voiceprints from whoever has them (when a voice was named wrongly)."""
    path = config.VOICEPRINTS_FILE
    if not vectors or not path.exists():
        return
    drop = [np.array(v, dtype=np.float32) for v in vectors]
    with _file_lock:
        raw = json.loads(path.read_text(encoding="utf-8"))
        for name in list(raw):
            raw[name] = [v for v in raw[name]
                         if max(similarity(np.array(v, dtype=np.float32), d) for d in drop) < 0.999]
            if not raw[name]:
                del raw[name]
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(raw), encoding="utf-8")
        tmp.replace(path)


def loudness_db(pcm: bytes) -> float:
    samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32)
    if samples.size == 0:
        return -120.0
    return float(20 * np.log10(np.sqrt(np.mean(samples ** 2)) / 32768.0 + 1e-9))


def centroid(vectors):
    if not vectors:
        return None
    c = np.mean(np.stack(vectors), axis=0)
    return c / (np.linalg.norm(c) + 1e-9)


# ---- contact memory: check names against saved voices, and learn from clear matches

VERIFY = 0.40                  # a name stays only if the voice matches that person's memory this well
LEARN = 0.55                   # a clear match (and a lead of LEARN_MARGIN) adds the sample to memory
LEARN_MARGIN = 0.10
VERIFY_SECONDS = 3.0           # less speech than this is too little to check


def person_scores(vec, people=None):
    """{name: similarity of vec to that person's saved voice}. Each person's memory is
    compared as an average and as its closest sample; the better of the two counts."""
    people = load_people() if people is None else people
    out = {}
    for name, vecs in people.items():
        c = centroid(vecs)
        best_one = max(similarity(vec, v) for v in vecs)
        out[name] = max(similarity(vec, c), best_one - 0.05)
    return out


def verify(vec, seconds, people=None):
    """Who this voice is, according to the contact memory.
    Returns {"name", "score", "runner_up", "runner_up_score", "verdict"} where verdict is
    "match" (name is reliable), "weak" (too little speech or too close to call) or "none"."""
    scores = person_scores(vec, people) if vec is not None else {}
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    best, best_s = (ranked[0] if ranked else (None, 0.0))
    second, second_s = (ranked[1] if len(ranked) > 1 else (None, 0.0))
    if best is None or best_s < VERIFY:
        verdict, name = "none", None
    elif seconds < VERIFY_SECONDS or best_s - second_s < MARGIN:
        verdict, name = "weak", best
    else:
        verdict, name = "match", best
    return {"name": name, "score": round(best_s, 2), "runner_up": second, "runner_up_score": round(second_s, 2), "verdict": verdict}


def should_learn(result, seconds):
    return (result["verdict"] == "match" and result["score"] >= LEARN
            and result["score"] - result["runner_up_score"] >= LEARN_MARGIN and seconds >= 4.0)
