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


def now():
    return datetime.now(timezone.utc)
