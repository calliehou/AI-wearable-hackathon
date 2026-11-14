// App state, filled with what the band heard (from the Mac) and the phone's contacts.
// Refreshes every few seconds; a new promise brings a notification and a vibration.
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as api from "./api";
import { contactsPermission, findContact, loadContacts, type PhoneContact } from "./contacts";
import type { Kind, Person, Todo } from "./types";

type Store = {
  ready: boolean;
  error: string | null;
  people: Person[];
  todos: Todo[];
  unknownVoices: api.UnknownVoice[];
  contacts: PhoneContact[];
  contactsStatus: "granted" | "denied" | "undetermined";
  askContacts: () => Promise<void>;
  refresh: () => Promise<void>;
  person: (id: string | null) => Person | undefined;
  todo: (id: string) => Todo | undefined;
  openFor: (personId: string) => Todo[];
  setTodoPerson: (todoId: string, person: { name: string }) => Promise<void>;
  nameVoice: (voice: api.UnknownVoice, name: string) => Promise<void>;
  setStatus: (todoId: string, status: Todo["status"]) => Promise<void>;
  addTodo: (fields: { title: string; quote: string; kind: Kind; amount: number | null; dueLabel: string; dueDetail: string | null }, personName: string | null) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
const POLL_MS = 4000;

export function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function askNotifications() {
  try {
    if (Platform.OS === "android") {
      // eslint-disable-next-line import/namespace -- AndroidImportance is exported (tsc checks it)
      await Notifications.setNotificationChannelAsync("promises", { name: "New promises", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 120, 250] });
    }
    const now = await Notifications.getPermissionsAsync();
    if (!now.granted) await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  } catch {
    /* notifications are a nice-to-have */
  }
}

async function announce(todo: api.ServerTodo) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: todo.personName ? `New promise to ${todo.personName}` : "New promise: who was it?",
        body: `${todo.title} · ${todo.dueLabel}${todo.dueDetail ? ` ${todo.dueDetail}` : ""}\n“${todo.quote}”`,
        data: { todoId: todo.id },
        ...(Platform.OS === "android" ? { channelId: "promises" } : null),
      },
      trigger: null,
    });
  } catch {
    /* permission not given: the vibration still happened */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<api.Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [contactsStatus, setContactsStatus] = useState<Store["contactsStatus"]>("undetermined");
  const seen = useRef<Set<string> | null>(null); // promise ids already shown; null until the first load

  const refresh = useCallback(async () => {
    try {
      const s = await api.fetchSnapshot();
      if (seen.current === null) {
        seen.current = new Set(s.todos.map((t) => t.id)); // first load: nothing is "new"
      } else {
        for (const t of s.todos) {
          if (!seen.current.has(t.id)) {
            seen.current.add(t.id);
            if (t.status === "open") announce(t);
          }
        }
      }
      setSnap(s);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first load from the Mac; the state is set after the network call
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const readContacts = useCallback(async () => {
    try {
      setContacts(await loadContacts());
    } catch {
      setContacts([]);
    }
  }, []);

  useEffect(() => {
    contactsPermission(false).then((s) => {
      setContactsStatus(s);
      if (s === "granted") readContacts();
    });
  }, [readContacts]);

  const askContacts = useCallback(async () => {
    const s = await contactsPermission(true);
    setContactsStatus(s);
    if (s === "granted") await readContacts();
  }, [readContacts]);

  const store = useMemo<Store>(() => {
    // People: everyone the band has a name for, with phone/email from the phone's contacts.
    const people: Person[] = (snap?.people ?? []).map((p) => {
      const c = findContact(contacts, p.name);
      return { id: p.id, name: p.name, lastHeard: p.lastHeard, phone: c?.phone, email: c?.email };
    });
    const todos: Todo[] = (snap?.todos ?? []).map((t) => ({ ...t, personId: t.personId }));
    const person = (id: string | null) => (id ? people.find((p) => p.id === id) : undefined);

    const patchLocal = (fn: (s: api.Snapshot) => api.Snapshot) => setSnap((s) => (s ? fn(s) : s));

    return {
      ready: snap !== null,
      error,
      people,
      todos,
      unknownVoices: snap?.unknownVoices ?? [],
      contacts,
      contactsStatus,
      askContacts,
      refresh,
      person,
      todo: (id) => todos.find((t) => t.id === id),
      openFor: (personId) => todos.filter((t) => t.personId === personId && t.status === "open"),

      setTodoPerson: async (todoId, p) => {
        const id = slug(p.name);
        patchLocal((s) => ({
          ...s,
          people: s.people.some((x) => x.id === id) ? s.people : [...s.people, { id, name: p.name, lastHeard: "Heard today", lastAt: new Date().toISOString() }],
          todos: s.todos.map((t) => (t.id === todoId ? { ...t, personId: id, personName: p.name } : t)),
        }));
        try {
          await api.updatePromise(todoId, { person_name: p.name });
        } finally {
          refresh();
        }
      },

      nameVoice: async (voice, name) => {
        patchLocal((s) => ({ ...s, unknownVoices: s.unknownVoices.filter((v) => !(v.interaction_id === voice.interaction_id && v.speaker === voice.speaker)) }));
        try {
          await api.nameVoice(voice, name);
        } finally {
          refresh();
        }
      },

      setStatus: async (todoId, status) => {
        patchLocal((s) => ({ ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, status } : t)) }));
        try {
          await api.updatePromise(todoId, { status });
        } finally {
          refresh();
        }
      },

      addTodo: async (f, personName) => {
        const saved = (await api.createPromise({
          title: f.title, quote: f.quote, kind: f.kind, amount: f.amount, due_label: f.dueLabel, due_detail: f.dueDetail, person_name: personName,
        })) as { id: string };
        seen.current?.add(saved.id); // you just added it: no notification for it
        await refresh();
      },
    };
  }, [snap, error, contacts, contactsStatus, askContacts, refresh]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be inside StoreProvider");
  return s;
}
