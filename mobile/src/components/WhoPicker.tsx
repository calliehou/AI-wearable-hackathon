// "Who is this?": pick the person a promise (or a voice) belongs to, from your phone's
// contacts or the people Sendly already knows. Naming a voice teaches the band to recognise it.
import { useState } from "react";
import { FlatList, Linking, Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import { colors, fonts } from "../theme";
import { Icon } from "./Icon";
import { Avatar, T } from "./ui";

type Row = { key: string; name: string; sub?: string };

export function WhoPicker({ visible, onClose, onPick, quote, title = "Who is this with?" }: {
  visible: boolean; onClose: () => void; onPick: (name: string) => void; quote?: string; title?: string;
}) {
  const { people, contacts, contactsStatus, askContacts } = useStore();
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const q = query.trim().toLowerCase();

  // People the band has heard first, then the rest of your contacts.
  const known = new Set(people.map((p) => p.name.toLowerCase()));
  const rows: Row[] = [
    ...people.map((p) => ({ key: `p-${p.id}`, name: p.name, sub: p.lastHeard })),
    ...contacts.filter((c) => !known.has(c.name.toLowerCase())).map((c) => ({ key: `c-${c.id}`, name: c.name, sub: c.phone })),
  ].filter((r) => !q || r.name.toLowerCase().includes(q));

  function choose(name: string) {
    const clean = name.trim();
    if (!clean) return;
    setQuery("");
    onPick(clean);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, height: "80%" }}>
        <View style={{ width: 56, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: "center", marginBottom: 16 }} />
        <T w="extrabold" style={{ fontSize: 22 }}>{title}</T>
        {quote ? (
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: colors.card, borderRadius: 16, padding: 12, marginTop: 10 }}>
            <Icon name="wave" size={16} stroke={2.4} />
            <T w="semibold" style={{ flex: 1, fontSize: 14, lineHeight: 19 }} numberOfLines={3}>“{quote}”</T>
          </View>
        ) : null}

        {contactsStatus !== "granted" && (
          <Pressable accessibilityRole="button" onPress={() => (contactsStatus === "denied" ? Linking.openSettings() : askContacts())}
            style={({ pressed }) => ({ marginTop: 14, height: 52, borderRadius: 26, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: pressed ? 0.8 : 1 })}>
            <Icon name="people" size={20} color={colors.white} />
            <T style={{ color: colors.white, fontSize: 15 }}>{contactsStatus === "denied" ? "Allow contacts in Settings" : "Show my contacts"}</T>
          </Pressable>
        )}

        <View style={{ marginTop: 12, height: 52, borderRadius: 26, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 18, paddingRight: 8 }}>
          <Icon name="search" size={20} />
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Search or type a name" placeholderTextColor={colors.muted}
            accessibilityLabel="Search contacts by name" returnKeyType="done" autoCorrect={false}
            onSubmitEditing={() => q && !rows.length && choose(query)}
            style={{ flex: 1, height: 48, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}
          />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          style={{ marginTop: 8 }}
          initialNumToRender={20}
          ListFooterComponent={
            q && !rows.some((r) => r.name.toLowerCase() === q) ? (
              <Pressable accessibilityRole="button" onPress={() => choose(query)} style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 64 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="plus" size={18} stroke={2.4} />
                </View>
                <T style={{ fontSize: 16 }}>Add “{query.trim()}”</T>
              </Pressable>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => choose(item.name)} style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 64, borderBottomWidth: 2, borderBottomColor: colors.card }}>
              <Avatar name={item.name} size={44} />
              <View style={{ flex: 1 }}>
                <T w="extrabold" style={{ fontSize: 16 }} numberOfLines={1}>{item.name}</T>
                {item.sub ? <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 1 }} numberOfLines={1}>{item.sub}</T> : null}
              </View>
              <Icon name="chevronRight" size={18} color={colors.grey} stroke={2.4} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

export function WhoPill({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Choose who this promise is with" onPress={onPress} hitSlop={8}
      style={{ marginTop: 4, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.dashed, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.white }}>
      <Icon name="question" size={13} stroke={2.6} />
      <T style={{ fontSize: 12 }}>Who is this?</T>
    </Pressable>
  );
}
