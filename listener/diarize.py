"""Deepgram with speaker labels: who said what.

The kit's DeepgramSpeech only keeps the text. With diarize=true Deepgram also tags every
word with a speaker number (0, 1, 2...). This subclass keeps those words and groups them
into turns: consecutive words by the same speaker.
"""
import sys

import config

sys.path.insert(0, str(config.KIT / "examples" / "python"))
import speech  # noqa: E402  vexo-open-kit/examples/python/speech.py


class DiarizedSpeech(speech.DeepgramSpeech):
    def __init__(self, **options):
        super().__init__(diarize="true", **options)
        self.words = []                       # [{"speaker": 0, "word": "Hi,", "start": 0.4, "end": 0.6}]

    def _message(self, message):
        if message.get("type") == "Results" and message.get("is_final"):
            best = (message.get("channel", {}).get("alternatives") or [{}])[0]
            for w in best.get("words") or []:
                self.words.append({
                    "speaker": int(w.get("speaker", 0)),
                    "word": w.get("punctuated_word") or w.get("word") or "",
                    "start": float(w.get("start", 0.0)),
                    "end": float(w.get("end", 0.0)),
                })
        super()._message(message)             # keeps the kit's live text printing


def turns_from_words(words):
    """Group words into turns: [{"speaker": 0, "text": "...", "start": s, "end": e}]."""
    turns = []
    for w in words:
        if turns and turns[-1]["speaker"] == w["speaker"]:
            turns[-1]["text"] += " " + w["word"]
            turns[-1]["end"] = w["end"]
        else:
            turns.append({"speaker": w["speaker"], "text": w["word"], "start": w["start"], "end": w["end"]})
    return turns


def turns_from_script(script):
    """Typed test input: lines like "0: Hi, I'm Sam" or "Speaker 1: Nice to meet you"."""
    turns, t = [], 0.0
    for line in script.replace("\\n", "\n").splitlines():
        if ":" not in line:
            continue
        who, text = line.split(":", 1)
        digits = "".join(c for c in who if c.isdigit())
        turns.append({"speaker": int(digits or 0), "text": text.strip(), "start": t, "end": t + 2.0})
        t += 2.0
    return turns
