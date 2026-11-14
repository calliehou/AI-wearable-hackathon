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


def read_conversation(turns, known_people, voices=None):
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
        "Voices already identified earlier in this same recording (same voice, same number): %s\n\n"
        "Conversation:\n%s" % (config.WEARER, known, ", ".join(str(s) for s in speakers),
                                "; ".join(heard) or "(none)", transcript_text(turns))
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
