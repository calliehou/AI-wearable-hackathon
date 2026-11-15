"""The interactions file the app reads: data/interactions.json, newest first."""
import json
import uuid
from datetime import datetime, timezone

import config


def load():
    if not config.DATA_FILE.exists():
        return []
    return json.loads(config.DATA_FILE.read_text(encoding="utf-8"))


def recent_context(n=8, hours=6):
    """Short summaries of the last few conversations, so Claude can tell who "him"/"her" is."""
    cutoff = now().timestamp() - hours * 3600
    lines = []
    for item in load()[:n]:
        try:
            if datetime.fromisoformat(item["started_at"]).timestamp() < cutoff:
                continue
        except (KeyError, ValueError):
            continue
        names = ", ".join(p["name"] for p in item.get("people", []) if p.get("name"))
        lines.append("- %s (with %s): %s" % (item["title"], names or "unknown", item["summary"]))
    return "\n".join(lines)


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


def _words(title):
    return {w for w in "".join(c.lower() if c.isalnum() else " " for c in title).split() if len(w) > 2}


def already_caught(pr, saved, minutes=30):
    """True if the same promise was saved in the last half hour (the live quick check usually
    catches it before the conversation ends): same person and kind, or a near-identical title."""
    cutoff = (now().timestamp() - minutes * 60)
    name = (pr.get("for_name") or "").lower()
    new = _words(pr["title"])
    for x in saved:
        if x.get("status") == "dismissed":
            continue
        try:
            at = datetime.fromisoformat(x["heard_at"]).timestamp()
        except (KeyError, ValueError):
            continue
        if at < cutoff:
            continue
        old = _words(x["title"])
        same_title = new and old and len(new & old) / max(len(new | old), 1) >= 0.6
        same_target = name and (x.get("person_name") or "").lower() == name and x["kind"] == pr["kind"] \
            and (x.get("amount") or None) == (pr.get("amount") or None)
        if same_title or same_target:
            return True
    return False


def save_promises(item, promises, min_confidence=0.6):
    """Promises the wearer made in one saved interaction -> data/promises.json (newest first).
    The person is the name of the voice it was promised to, or None: the app then asks
    "Who is this?" and naming them there teaches the band that voice."""
    people = {p["speaker"]: p for p in item["people"]}
    saved = load_promises()
    existing = {(x["interaction_id"], x["title"].lower()) for x in saved}
    new = []
    for pr in promises:
        if pr.get("confidence", 0) < min_confidence:
            continue
        if (item["id"], pr["title"].lower()) in existing or already_caught(pr, saved):
            continue                                   # already saved (re-read, or caught live a moment ago)
        to = pr.get("to_speaker")
        speaker = people.get(to) if to is not None else None
        if speaker and speaker.get("is_wearer"):
            to, speaker = None, None                  # promised "to" the wearer: the target is unclear
        named = (pr.get("for_name") or "").strip() or None
        if named:
            # The wearer said a name ("Mom", "Kelly"). Link to the voice only if it is that person.
            if speaker and (speaker.get("name") or "").lower().split(" ")[0] == named.lower().split(" ")[0]:
                person, source = speaker.get("name"), "voice"
            else:
                to, person, source = None, named, "named"   # the app asks to pick them from contacts
        elif speaker:
            person, source = speaker.get("name"), "voice" if speaker.get("name") else None
        else:
            person, source = None, None
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
            "due_date": pr.get("due_date"),
            "due_time": pr.get("due_time"),
            "confidence": pr.get("confidence", 0.8),
            "speaker": to,                            # voice it was promised to, in that interaction
            "person_name": person,
            "person_source": source,                  # "voice", "named" (said, not yet picked) or "picked"
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


PAYEES_FILE = config.ROOT / "data" / "payees.json"   # how to pay each person (gitignored)


def person_id(name):
    """Same id as the Mac server's personId()."""
    import re
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "person"


def save_payee(name, handle, kind, quote):
    """Remember a Venmo handle heard in conversation. Never replaces one typed in the app.
    Returns True if it was saved."""
    try:
        all_ = json.loads(PAYEES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        all_ = {}
    pid = person_id(name)
    now_ = dict(all_.get(pid) or {})
    if now_.get("venmo") and now_.get("venmoSource") != "heard":
        return False                                     # the wearer entered or confirmed one
    if now_.get("venmo") == handle:
        return False
    now_.update({"venmo": handle, "method": "venmo", "venmoSource": "heard", "venmoKind": kind, "venmoHeard": quote[:140]})
    all_[pid] = now_
    PAYEES_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = PAYEES_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(all_, indent=2), encoding="utf-8")
    tmp.replace(PAYEES_FILE)
    return True

