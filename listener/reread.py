"""Ask Claude again for conversations saved as "Unread conversation" (Claude failed at the time,
e.g. no API credits). Fills in the title, summary and people, and saves their promises and
Venmo details like the listener would. Safe to run while the listener is recording.

    .venv/bin/python listener/reread.py            # all of them, oldest first
    .venv/bin/python listener/reread.py quinn      # only conversations that mention "quinn"
"""
import json
import sys

import config
import store
import summarize
from listen import save_payments


def update(item_id, fields):
    """Change one saved conversation, re-reading the file first (the listener may have added one)."""
    items = store.load()
    for it in items:
        if it["id"] == item_id:
            it.update(fields)
    tmp = config.DATA_FILE.with_suffix(".reread.tmp")
    tmp.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(config.DATA_FILE)


def main():
    only = sys.argv[1:]                                # optional: conversation ids, or words they contain
    unread = [it for it in reversed(store.load()) if it.get("title") == "Unread conversation" and it.get("turns")]
    if only:
        unread = [it for it in unread if it["id"] in only
                  or any(w.lower() in " ".join(t["text"] for t in it["turns"]).lower() for w in only)]
    print("%d unread conversation(s)." % len(unread))
    done = 0
    for it in unread:                                   # oldest first, so context builds up in order
        hints = {p["speaker"]: {"name": p.get("name"), "is_wearer": bool(p.get("is_wearer"))} for p in it["people"]}
        try:
            reading = summarize.read_conversation(it["turns"], store.known_people(), hints)
        except RuntimeError as error:
            print("Stopped at %s: %s" % (it["started_at"], error))
            if "credit" in str(error).lower() or "401" in str(error):
                break                                   # no point trying the rest
            continue
        old = {p["speaker"]: p for p in it["people"]}
        people = []
        for p in reading["people"]:                     # keep the saved voiceprints and match details
            keep = {k: v for k, v in old.get(p["speaker"], {}).items() if k in ("voiceprint", "match")}
            people.append(dict(p, **keep))
        fields = {"title": reading["title"], "summary": reading["summary"], "people": people,
                  "topics": reading["topics"], "follow_ups": reading["follow_ups"]}
        update(it["id"], fields)
        it.update(fields)
        new = store.save_promises(it, reading.get("promises", []))
        save_payments(it, reading.get("payments", []))
        done += 1
        print("Read: %s%s" % (reading["title"], "".join("\n  New promise: %s (to %s)" % (p["title"], p["person_name"] or "someone")
                                                      for p in new)))
    print("Done: %d of %d read." % (done, len(unread)))


if __name__ == "__main__":
    main()
