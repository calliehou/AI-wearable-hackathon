// App state: people and to-dos. Starts from sample data; the band listener will feed it later.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { samplePeople, sampleTodos } from "./sample";
import type { Person, Todo } from "./types";

type Store = {
  people: Person[];
  todos: Todo[];
  person: (id: string | null) => Person | undefined;
  todo: (id: string) => Todo | undefined;
  openFor: (personId: string) => Todo[];
  setTodoPerson: (todoId: string, person: Omit<Person, "id"> & { id?: string }) => void;
  setStatus: (todoId: string, status: Todo["status"]) => void;
  addTodo: (todo: Omit<Todo, "id" | "personId" | "status">, personName: string | null) => Todo;
};

const Ctx = createContext<Store | null>(null);

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>(samplePeople);
  const [todos, setTodos] = useState<Todo[]>(sampleTodos);

  const store = useMemo<Store>(() => {
    const person = (id: string | null) => (id ? people.find((p) => p.id === id) : undefined);
    return {
      people,
      todos,
      person,
      todo: (id) => todos.find((t) => t.id === id),
      openFor: (personId) => todos.filter((t) => t.personId === personId && t.status === "open"),
      setTodoPerson: (todoId, p) => {
        // Reuse a person with the same name (or id); otherwise add them from the contact.
        let existing = people.find((x) => (p.id && x.id === p.id) || x.name.toLowerCase() === p.name.toLowerCase());
        if (!existing) {
          let id = slug(p.name);
          while (people.some((x) => x.id === id)) id += "-2";
          existing = { ...p, id, lastHeard: "Heard today" };
          setPeople((all) => [...all, existing!].sort((a, b) => a.name.localeCompare(b.name)));
        }
        const pid = existing.id;
        setTodos((all) => all.map((t) => (t.id === todoId ? { ...t, personId: pid } : t)));
      },
      addTodo: (fields, personName) => {
        let personId: string | null = null;
        if (personName) {
          const found = people.find((x) => x.name.toLowerCase() === personName.toLowerCase())
            ?? people.find((x) => x.name.toLowerCase().split(" ")[0] === personName.toLowerCase().split(" ")[0]);
          if (found) personId = found.id;
          else {
            let id = slug(personName);
            while (people.some((x) => x.id === id)) id += "-2";
            setPeople((all) => [...all, { id, name: personName, lastHeard: "Heard today" }].sort((a, b) => a.name.localeCompare(b.name)));
            personId = id;
          }
        }
        const todo: Todo = { ...fields, id: `v${Date.now()}`, personId, status: "open" };
        setTodos((all) => [todo, ...all]);
        return todo;
      },
      setStatus: (todoId, status) => setTodos((all) => all.map((t) => (t.id === todoId ? { ...t, status } : t))),
    };
  }, [people, todos]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be inside StoreProvider");
  return s;
}
