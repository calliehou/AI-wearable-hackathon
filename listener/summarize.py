"""Claude reads a diarized conversation: who the speakers are, title, summary, follow-ups."""
import json
import os

import anthropic

import config

SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "people": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "speaker": {"type": "integer"},
                    "name": {"type": ["string", "null"]},
                    "is_wearer": {"type": "boolean"},
                    "evidence": {"type": "string"},
                },
                "required": ["speaker", "name", "is_wearer", "evidence"],
                "additionalProperties": False,
            },
        },
        "topics": {"type": "array", "items": {"type": "string"}},
        "follow_ups": {"type": "array", "items": {"type": "string"}},
        "promises": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "for_name": {"type": ["string", "null"]},
                    "to_speaker": {"type": ["integer", "null"]},
                    "title": {"type": "string"},
                    "quote": {"type": "string"},
                    "kind": {"type": "string", "enum": ["money", "gift", "task", "plan", "call"]},
                    "amount": {"type": ["number", "null"]},
                    "due_label": {"type": "string"},
                    "due_detail": {"type": ["string", "null"]},
                    "confidence": {"type": "number"},
                },
                "required": ["for_name", "to_speaker", "title", "quote", "kind", "amount", "due_label", "due_detail", "confidence"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "summary", "people", "topics", "follow_ups", "promises"],
    "additionalProperties": False,
}


def load_env_file():
    """Put keys from the repo's .env into the environment (the kit does this for Deepgram;
    the Anthropic SDK only reads the environment). Values are never printed."""
    path = config.ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            value = value.split(" #")[0].strip().strip('"').strip("'")
            if value and not os.environ.get(name.strip()):
                os.environ[name.strip()] = value


def transcript_text(turns):
    return "\n".join("Speaker %d: %s" % (t["speaker"], t["text"]) for t in turns)


def read_conversation(turns, known_people, voices=None, recent=""):
    """Returns the dict described by SCHEMA. Raises RuntimeError with a short reason."""
    load_env_file()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("No ANTHROPIC_API_KEY: add it to the .env file in the repo root.")
    speakers = sorted({t["speaker"] for t in turns})
    known = ", ".join(known_people) if known_people else "(nobody yet)"
    voices = voices or {}
    heard = [("Speaker %d = %s%s" % (n, v["name"], " (the wearer)" if v.get("is_wearer") else ""))
             for n, v in sorted(voices.items()) if v.get("name") and n in speakers]
    user = (
        "The wearer is: %s\n"
        "People the wearer has met before: %s\n"
        "Speakers in this conversation: %s\n"
        "Voices already identified earlier in this same recording (same voice, same number): %s\n"
        "Recent conversations, for context only (who \"him\"/\"her\" may be):\n%s\n\n"
        "Conversation:\n%s" % (config.WEARER, known, ", ".join(str(s) for s in speakers),
                                "; ".join(heard) or "(none)", recent or "(none)", transcript_text(turns))
    )
    client = anthropic.Anthropic()
    try:
        response = client.beta.messages.create(
            model=config.MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",             # if Claude declines, the API retries on a fallback model
            thinking={"type": "adaptive"},
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
            system=config.PROMPT_FILE.read_text(encoding="utf-8"),
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.AuthenticationError:
        raise RuntimeError("Claude did not accept the ANTHROPIC_API_KEY (status 401).") from None
    except anthropic.RateLimitError:
        raise RuntimeError("Claude is rate limiting this key (status 429): wait a little and try again.") from None
    except anthropic.APIStatusError as e:
        raise RuntimeError("Claude API error (status %d)." % e.status_code) from None
    except anthropic.APIConnectionError:
        raise RuntimeError("Could not reach the Claude API: check the internet connection.") from None

    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to read this conversation.")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Claude's answer was cut off (max_tokens).")
    text = next(b.text for b in response.content if b.type == "text")
    result = json.loads(text)
    # Keep only speakers that really spoke, one entry each.
    seen, people = set(), []
    for p in result["people"]:
        if p["speaker"] in speakers and p["speaker"] not in seen:
            seen.add(p["speaker"])
            people.append(p)
    for s in speakers:
        if s not in seen:
            people.append({"speaker": s, "name": None, "is_wearer": False, "evidence": "Not identified."})
    wearer_known = any(v.get("is_wearer") for n, v in voices.items() if n in speakers)
    for p in people:
        earlier = voices.get(p["speaker"], {})
        if earlier.get("name"):
            # Recognised by voiceprint (or named earlier): that beats a guess from the words.
            p["name"], p["evidence"] = earlier["name"], "Recognised by voice."
        if wearer_known:
            p["is_wearer"] = bool(earlier.get("is_wearer"))
        if p["is_wearer"]:
            p["name"] = config.WEARER     # the wearer's name is known; don't rely on it being said
    result["people"] = sorted(people, key=lambda p: p["speaker"])
    return result


# ---- quick check while people are still talking

QUICK_SCHEMA = {
    "type": "object",
    "properties": {"promises": SCHEMA["properties"]["promises"]},
    "required": ["promises"],
    "additionalProperties": False,
}

QUICK_SYSTEM = """You see the last few lines of a conversation recorded by a wristband. Lines start
with who spoke. The wearer is %s. List only commitments the wearer just made for another person
(present or not), including shared plans the wearer is part of: "I'll send you...", "I need to buy
my mom a present", "I owe Leo $20", "we need to buy him a soccer gift or send him $5".
Lines may be cut mid-sentence; read them as one flow. When the wearer says "him"/"her"/"them",
use the recent conversations to tell who it is; if unclear, for_name is null. One idea with
alternatives is one promise.
Follow the same field rules as always: for_name is the person as the wearer named them (or null
if they said "you"), to_speaker is null here, a short title with the person, kind money/gift/task/plan/call,
amount, due_label ("Today", "Tonight", "Tmrw", a weekday, "Next week" or "Soon"), due_detail,
confidence 0-1. If nothing is a clear commitment, return an empty list."""


def quick_promises(lines, known_people, recent=""):
    """Fast check of a few fresh lines for promises (returns the promises list)."""
    load_env_file()
    client = anthropic.Anthropic()
    response = client.beta.messages.create(
        model=config.MODEL,
        max_tokens=4000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        thinking={"type": "adaptive"},
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": QUICK_SCHEMA}},
        system=QUICK_SYSTEM % config.WEARER,
        messages=[{"role": "user", "content": "People the wearer knows: %s\nRecent conversations:\n%s\n\nJust now:\n%s" % (
            ", ".join(known_people) or "(none)", recent or "(none)", lines)}],
    )
    if response.stop_reason in ("refusal", "max_tokens"):
        return []
    text = next((b.text for b in response.content if b.type == "text"), "")
    return json.loads(text).get("promises", []) if text else []
