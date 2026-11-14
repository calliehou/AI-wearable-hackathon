// 02 · Contacts: who's waiting on you, everyone else (all clear), and search across
// people, promises and your phone's contacts.
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, NAV_SPACE } from "../components/BottomNav";
import { Icon, typeIcon } from "../components/Icon";
import { Avatar, RoundButton, T } from "../components/ui";
import { useConfirmDelete } from "../components/Confirm";
import { RenameSheet } from "../components/RenameSheet";
import { useStore } from "../data/store";
import type { Person } from "../data/types";
import { colors, fonts, TYPE_TONE } from "../theme";

export default function Contacts() {
  const s = useStore();
  const confirmDelete = useConfirmDelete();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [showClear, setShowClear] = useState(false);
  const [renaming, setRenaming] = useState<Person | null>(null);
  const q = query.trim().toLowerCase();

  const openOf = (p: Person) => s.openFor(p.id);
  const matches = (p: Person) => !q || p.name.toLowerCase().includes(q) || openOf(p).some((t) => t.title.toLowerCase().includes(q) || t.quote.toLowerCase().includes(q));
  const waiting = s.people.filter((p) => p.open > 0 && matches(p))
    .sort((a, b) => (dueSoon(s, b) - dueSoon(s, a)) || b.open - a.open);
  const clear = s.people.filter((p) => p.open === 0 && matches(p));
  const unknownOpen = s.todos.filter((t) => t.status === "open" && !t.personId && (!q || t.title.toLowerCase().includes(q)));
  const [shown, setShown] = useState(60);
  const phone = s.contacts.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~"));
  const heardAs = (name: string) => s.people.find((p) => p.name.toLowerCase() === name.toLowerCase());
  const promisesCount = s.todos.filter((t) => t.status === "open").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: NAV_SPACE }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 }}>
          <RoundButton icon="back" label="Back to My orbit" onPress={() => router.replace("/")} />
          <Pressable accessibilityRole="button" onPress={() => router.push("/circles")}
            style={{ height: 40, borderRadius: 20, backgroundColor: colors.card, paddingHorizontal: 16, justifyContent: "center" }}>
            <T style={{ fontSize: 13 }}>Circles</T>
          </Pressable>
        </View>
        <T w="extrabold" style={{ fontSize: 36, letterSpacing: -1.2, paddingHorizontal: 20, marginTop: 10 }}>Contacts</T>

        <View style={{ marginHorizontal: 20, marginTop: 14, height: 48, borderRadius: 24, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 16, paddingRight: 8 }}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search contacts, promises, places" placeholderTextColor={colors.muted}
            accessibilityLabel="Search contacts" autoCorrect={false}
            style={{ flex: 1, height: 44, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} />
          {query.length > 0 && <RoundButton icon="close" label="Clear search" size={32} bg={colors.white} onPress={() => setQuery("")} />}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 20, marginBottom: 8 }}>
          <T w="extrabold" style={{ fontSize: 14 }}>Waiting on you</T>
          <T style={{ fontSize: 13, color: colors.muted }}>{promisesCount} promise{promisesCount === 1 ? "" : "s"}</T>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {waiting.map((p) => {
            const open = openOf(p);
            const urgent = open.some((t) => ["Today", "Tonight"].includes(t.dueLabel));
            const first = open[0];
            const types = [...new Set(open.map((t) => t.type))];
            return (
              <Pressable key={p.id} accessibilityRole="button" accessibilityHint="Long press to edit the name" onPress={() => router.push({ pathname: "/person/[id]", params: { id: p.id } })}
                onLongPress={() => setRenaming(p)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66, paddingHorizontal: 12, borderRadius: 20,
                  backgroundColor: urgent ? "#FFF1E8" : colors.card, borderWidth: urgent ? 1.5 : 0, borderColor: "#F9C9A8" }}>
                <Avatar name={p.name} size={42} color={s.personColor(p)} badge={p.open} ring={urgent} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{p.name}</T>
                  <T w="medium" style={{ fontSize: 12, color: urgent || open.some((t) => t.personSource === "named") ? colors.rust : colors.muted, marginTop: 2 }} numberOfLines={1}>
                    {open.some((t) => t.personSource === "named") ? "Pick from contacts · " : ""}
                    {[p.circles[0], first ? `${first.title.replace(p.name, "").trim()} ${first.dueLabel.toLowerCase()}` : null].filter(Boolean).join(" · ")}
                  </T>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {types.map((t) => (
                    <View key={t} accessibilityLabel={t} style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: TYPE_TONE[t], alignItems: "center", justifyContent: "center" }}>
                      <Icon name={typeIcon[t]} size={15} stroke={2.4} />
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
          {unknownOpen.map((t) => (
            <Pressable key={t.id} accessibilityRole="button" accessibilityHint="Long press to delete" onPress={() => router.push({ pathname: "/promise/[id]", params: { id: t.id } })}
              onLongPress={() => confirmDelete(t)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.card }}>
              <Avatar name={null} unknown size={42} />
              <View style={{ flex: 1 }}>
                <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{t.title}</T>
                <T style={{ fontSize: 12, color: colors.rust, marginTop: 2 }}>Who is this? Tap to choose</T>
              </View>
            </Pressable>
          ))}
          {!waiting.length && !unknownOpen.length && <T w="medium" style={{ fontSize: 14, color: colors.muted, paddingHorizontal: 4 }}>{q ? "Nobody waiting matches that." : "Nobody is waiting on you. Nice."}</T>}
        </View>

        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showClear }} onPress={() => setShowClear(!showClear)}
          style={{ marginHorizontal: 16, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E2F2E7", alignItems: "center", justifyContent: "center" }}>
            <Icon name="tick" size={13} stroke={3} />
          </View>
          <T w="extrabold" style={{ flex: 1, fontSize: 14 }}>All clear · {clear.length}</T>
          <T style={{ fontSize: 13, color: colors.muted }}>{showClear || !!q ? "Hide" : "Show"}</T>
        </Pressable>
        {(showClear || !!q) && (
          <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
            {clear.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" accessibilityHint="Long press to edit the name" onPress={() => router.push({ pathname: "/person/[id]", params: { id: p.id } })}
                onLongPress={() => setRenaming(p)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, borderBottomWidth: 1.5, borderBottomColor: colors.card }}>
                <Avatar name={p.name} size={36} color={s.personColor(p)} faded={p.drifting} />
                <T w="extrabold" style={{ flex: 1, fontSize: 15 }}>{p.name}</T>
                <T w="medium" style={{ fontSize: 12, color: p.drifting ? colors.rust : colors.muted }}>{p.drifting ? `drifting · ${p.quietFor}` : p.lastHeard}</T>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 22, marginBottom: 6 }}>
          <T w="extrabold" style={{ fontSize: 14 }}>Phone contacts</T>
          {s.contactsStatus === "granted" ? <T style={{ fontSize: 13, color: colors.muted }}>{phone.length}</T> : null}
        </View>
        {s.contactsStatus !== "granted" ? (
          <Pressable accessibilityRole="button" onPress={() => (s.contactsStatus === "denied" ? Linking.openSettings() : s.askContacts())}
            style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.card }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
              <Icon name="contacts" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" style={{ fontSize: 14 }}>{s.contactsStatus === "denied" ? "Allow contacts in Settings" : "Show my phone contacts"}</T>
              <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>So you can pick who each promise is for</T>
            </View>
          </Pressable>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {phone.slice(0, shown).map((c) => {
              const known = heardAs(c.name);
              return (
                <Pressable key={c.id} accessibilityRole="button" disabled={!known}
                  onPress={() => known && router.push({ pathname: "/person/[id]", params: { id: known.id } })}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderBottomWidth: 1.5, borderBottomColor: colors.card }}>
                  <Avatar name={c.name} size={36} color={known ? s.personColor(known) : undefined} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{c.name}</T>
                    {c.phone ? <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 1 }} numberOfLines={1}>{c.phone}</T> : null}
                  </View>
                  <T w="medium" style={{ fontSize: 12, color: known ? colors.ink : colors.muted }}>{known ? known.lastHeard : "Not heard yet"}</T>
                </Pressable>
              );
            })}
            {phone.length > shown && (
              <Pressable accessibilityRole="button" onPress={() => setShown(shown + 100)} style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontSize: 14, color: colors.soft }}>Show more ({phone.length - shown})</T>
              </Pressable>
            )}
            {!phone.length && <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>{q ? "No contact matches that." : "No contacts on this phone."}</T>}
          </View>
        )}
      </ScrollView>
      <BottomNav />
      {renaming && (
        <RenameSheet key={renaming.id} visible name={renaming.name} onClose={() => setRenaming(null)}
          onSave={async (to) => { await s.renamePerson(renaming.name, to); }} />
      )}
    </View>
  );
}

function dueSoon(s: ReturnType<typeof useStore>, p: Person) {
  return s.openFor(p.id).some((t) => ["Today", "Tonight"].includes(t.dueLabel)) ? 1 : 0;
}
