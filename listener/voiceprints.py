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
MIN_SECONDS = 1.0              # shorter stretches are too little sound to recognise anyone
MATCH = 0.40                   # similarity needed to say "same person" (same voice ~0.6-0.9, different ~0-0.3)
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


def centroid(vectors):
    if not vectors:
        return None
    c = np.mean(np.stack(vectors), axis=0)
    return c / (np.linalg.norm(c) + 1e-9)
