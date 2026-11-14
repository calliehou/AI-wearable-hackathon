// "Who is this?": when the band didn't catch who a to-do is with, pick the person from
// people Sendly already knows or from the phone's contacts.
import { Contact } from "expo-contacts";
import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import { colors, fonts } from "../theme";
import { Icon } from "./Icon";
import { Avatar, T } from "./ui";

export function WhoPicker({ todoId, visible, onClose }: { todoId: string; visible: boolean; onClose: () => void }) {
  const { people, setTodoPerson } = useStore();
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const q = query.trim().toLowerCase();
  const matches = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;

  function choose(p: { id?: string; name: string; phone?: string }) {
    setTodoPerson(todoId, p);
    setQuery("");
    onClose();
  }

  async function fromContacts() {
    try {
      const contact = await Contact.presentPicker();
      if (!contact) return; // cancelled
      const name = (await contact.getFullName()).trim();
      const phones = await contact.getPhones().catch(() => []);
      if (!name) {
        Alert.alert("That contact has no name", "Pick another contact, or type the name in the search box.");
        return;
      }
      choose({ name, phone: phones[0]?.number ?? undefined });
    } catch {
      Alert.alert("Contacts unavailable", "Sendly couldn't open your contacts. Type the name in the search box instead.");
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16, maxHeight: "80%" }}>
        <View style={{ width: 56, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: "center", marginBottom: 16 }} />
        <T w="extrabold" style={{ fontSize: 22 }}>Who is this with?</T>
        <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          Your band heard the promise but not the name.
        </T>

        <Pressable
          accessibilityRole="button" onPress={fromContacts}
          style={({ pressed }) => ({ marginTop: 16, height: 56, borderRadius: 28, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: pressed ? 0.8 : 1 })}
        >
          <Icon name="people" size={20} color={colors.white} />
          <T style={{ color: colors.white, fontSize: 16 }}>Choose from my contacts</T>
        </Pressable>

        <View style={{ marginTop: 14, height: 52, borderRadius: 26, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 18, paddingRight: 8 }}>
          <Icon name="search" size={20} />
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Search or type a name" placeholderTextColor={colors.muted}
            accessibilityLabel="Search people by name" returnKeyType="done"
            onSubmitEditing={() => q && !matches.length && choose({ name: query.trim() })}
            style={{ flex: 1, height: 48, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}
          />
        </View>

        <FlatList
          data={matches}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          style={{ marginTop: 8 }}
          ListFooterComponent={
            q && !people.some((p) => p.name.toLowerCase() === q) ? (
              <Pressable accessibilityRole="button" onPress={() => choose({ name: query.trim() })} style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 64 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="plus" size={18} stroke={2.4} />
                </View>
                <T style={{ fontSize: 16 }}>Add “{query.trim()}”</T>
              </Pressable>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => choose(item)} style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 64, borderBottomWidth: 2, borderBottomColor: colors.card }}>
              <Avatar name={item.name} size={44} />
              <T w="extrabold" style={{ fontSize: 16, flex: 1 }}>{item.name}</T>
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
