"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { displayName, type Person } from "@/lib/people";

export default function PersonName({
  interactionId,
  person,
  readOnly,
}: {
  interactionId: string;
  person: Person;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name ?? "");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/interactions/${interactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker: person.speaker, name: name.trim() || null }),
    });
    if (!res.ok) {
      setError("Could not save the name.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`name-${person.speaker}`}>
          Name for speaker {person.speaker + 1}
        </label>
        <input
          id={`name-${person.speaker}`}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Speaker ${person.speaker + 1}`}
          className="min-h-11 flex-1 rounded-lg border border-line bg-background px-3"
        />
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-medium text-on-accent">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-3 text-muted">
          Cancel
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium">{displayName(person, person.speaker)}</span>
      {!readOnly && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-11 rounded-lg px-3 text-sm text-accent hover:bg-background"
        >
          {person.name ? "Rename" : "Add name"}
        </button>
      )}
    </div>
  );
}
