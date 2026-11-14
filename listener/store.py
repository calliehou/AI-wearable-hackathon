"""The interactions file the app reads: data/interactions.json, newest first."""
import json
import uuid
from datetime import datetime, timezone

import config


def load():
    if not config.DATA_FILE.exists():
        return []
    return json.loads(config.DATA_FILE.read_text(encoding="utf-8"))


def known_people():
    names = []
    for item in load():
        for p in item.get("people", []):
            if p.get("name") and not p.get("is_wearer") and p["name"] not in names:
                names.append(p["name"])
    return names


def save(started_at, ended_at, turns, reading, source):
    item = {
        "id": uuid.uuid4().hex[:12],
        "started_at": started_at.isoformat(),
        "ended_at": ended_at.isoformat(),
        "duration_seconds": round((ended_at - started_at).total_seconds()),
        "source": source,                 # "band-24", "sim" or "typed"
        "title": reading["title"],
        "summary": reading["summary"],
        "people": reading["people"],
        "topics": reading["topics"],
        "follow_ups": reading["follow_ups"],
        "turns": turns,
    }
    items = [item] + load()
    config.DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = config.DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(config.DATA_FILE)
    return item


def load_promises():
    if not config.PROMISES_FILE.exists():
        return []
    return json.loads(config.PROMISES_FILE.read_text(encoding="utf-8"))


def save_promises(item, promises, min_confidence=0.6):
    """Promises the wearer made in one saved interaction -> data/promises.json (newest first).
    The person is the name of the voice it was promised to, or None: the app then asks
    "Who is this?" and naming them there teaches the band that voice."""
    people = {p["speaker"]: p for p in item["people"]}
    new = []
    for pr in promises:
        if pr.get("confidence", 0) < min_confidence:
            continue
        to = pr.get("to_speaker")
        person = people.get(to) if to is not None else None
        if person and person.get("is_wearer"):
            to, person = None, None                   # promised "to" the wearer: the target is unclear
        new.append({
            "id": uuid.uuid4().hex[:12],
            "interaction_id": item["id"],
            "heard_at": item["started_at"],
            "title": pr["title"],
            "quote": pr["quote"],
            "kind": pr["kind"],
            "amount": pr.get("amount"),
            "due_label": pr.get("due_label") or "Soon",
            "due_detail": pr.get("due_detail"),
            "confidence": pr.get("confidence", 0.8),
            "speaker": to,                            # voice it was promised to, in that interaction
            "person_name": person.get("name") if person else None,
            "status": "open",
        })
    if not new:
        return []
    items = new + load_promises()
    tmp = config.PROMISES_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(config.PROMISES_FILE)
    return new


def now():
    return datetime.now(timezone.utc)
