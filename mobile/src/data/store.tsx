// App state, filled with what the band heard (from the Mac) and the phone's contacts.
// Refreshes every few seconds; a new promise brings a notification and a vibration.
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as api from "./api";
import { contactsPermission, findContact, loadContacts, type PhoneContact } from "./contacts";
import type { Circle, Payee, Person, Todo } from "./types";

type Store = {
  ready: boolean;
  error: string | null;
  people: Person[];
  todos: Todo[];
  circles: Circle[];
  recs: api.Rec[];
  stats: api.Snapshot["stats"];
  band: api.Snapshot["band"];
  unknownVoices: api.UnknownVoice[];
  contacts: PhoneContact[];
  contactsStatus: "granted" | "denied" | "undetermined";
  askContacts: () => Promise<void>;
  refresh: () => Promise<void>;
  person: (id: string | null) => Person | undefined;
  todo: (id: string) => Todo | undefined;
  openFor: (personId: string) => Todo[];
  circleColor: (name: string) => string | undefined;
  personColor: (p: Person | undefined) => string | undefined;
  setTodoPerson: (todoId: string, person: { name: string }) => Promise<void>;
  nameVoice: (voice: api.UnknownVoice, name: string) => Promise<void>;
  setStatus: (todoId: string, status: Todo["status"]) => Promise<void>;
  changePromise: (todoId: string, change: api.PromiseChange) => Promise<void>;
  addPromises: (items: api.NewPromise[]) => Promise<void>;
  createCircle: (name: string, color: string) => Promise<void>;
  setMembership: (person: string, circle: string, member: boolean) => Promise<void>;
  pauseBand: (paused: boolean) => Promise<void>;
  setPayee: (person: string, change: Payee) => Promise<void>;
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

async function announce(todo: Todo) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: todo.personSource === "named" && todo.personName ? `Promise heard · pick ${todo.personName} from contacts`
          : todo.personName ? `Promise heard · ${todo.personName}` : "Promise heard · who was it?",
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

const EMPTY_STATS = { promisesToday: 0, conversationsToday: 0 };
const EMPTY_BAND = { running: false, connected: false, recording: false, paused: false };

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
    const circles = snap?.circles ?? [];
    const people: Person[] = (snap?.people ?? []).map((p) => {
      const c = findContact(contacts, p.name);
      return { ...p, phone: c?.phone, email: c?.email };
    });
    const todos: Todo[] = snap?.todos ?? [];
    const person = (id: string | null) => (id ? people.find((p) => p.id === id) : undefined);
    const circleColor = (name: string) => circles.find((c) => c.name === name)?.color;
    const patchLocal = (fn: (s: api.Snapshot) => api.Snapshot) => setSnap((s) => (s ? fn(s) : s));
    const thenRefresh = async (p: Promise<unknown>) => {
      try {
        await p;
      } finally {
        refresh();
      }
    };

    return {
      ready: snap !== null,
      error,
      people,
      todos,
      circles,
      recs: snap?.recs ?? [],
      stats: snap?.stats ?? EMPTY_STATS,
      band: snap?.band ?? EMPTY_BAND,
      unknownVoices: snap?.unknownVoices ?? [],
      contacts,
      contactsStatus,
      askContacts,
      refresh,
      person,
      todo: (id) => todos.find((t) => t.id === id),
      openFor: (personId) => todos.filter((t) => t.personId === personId && t.status === "open"),
      circleColor,
      personColor: (p) => (p?.circles[0] ? circleColor(p.circles[0]) : undefined),

      setTodoPerson: (todoId, p) => {
        const id = slug(p.name);
        patchLocal((s) => ({ ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, personId: id, personName: p.name } : t)) }));
        return thenRefresh(api.updatePromise(todoId, { person_name: p.name }));
      },
      nameVoice: (voice, name) => {
        patchLocal((s) => ({ ...s, unknownVoices: s.unknownVoices.filter((v) => !(v.interaction_id === voice.interaction_id && v.speaker === voice.speaker)) }));
        return thenRefresh(api.nameVoice(voice, name));
      },
      setStatus: (todoId, status) => {
        patchLocal((s) => ({ ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, status } : t)) }));
        return thenRefresh(api.updatePromise(todoId, { status }));
      },
      changePromise: (todoId, change) => {
        patchLocal((s) => ({ ...s, todos: s.todos.map((t) => (t.id === todoId ? { ...t, ...(change.type ? { type: change.type } : {}) } : t)) }));
        return thenRefresh(api.updatePromise(todoId, change));
      },
      addPromises: async (items) => {
        for (const p of items) {
          const saved = await api.createPromise(p);
          seen.current?.add(saved.id); // you just added it: no notification for it
        }
        await refresh();
      },
      createCircle: (name, color) => thenRefresh(api.createCircle(name, color)),
      setMembership: (personName, circle, member) => {
        const id = slug(personName);
        patchLocal((s) => ({
          ...s,
          people: s.people.map((p) => (p.id === id ? { ...p, circles: member ? [...new Set([...p.circles, circle])] : p.circles.filter((c) => c !== circle) } : p)),
        }));
        return thenRefresh(api.setMembership(personName, circle, member));
      },
      setPayee: (personName, change) => {
        const id = slug(personName);
        patchLocal((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, payee: { ...p.payee, ...change } } : p)) }));
        return thenRefresh(api.setPayee(personName, change));
      },
      pauseBand: (paused) => {
        patchLocal((s) => ({ ...s, band: { ...s.band, paused } }));
        return thenRefresh(api.pauseBand(paused));
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
