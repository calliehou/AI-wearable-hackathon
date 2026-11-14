// Merge two entries for the same person ("Callie" and "Callie Hou"). Everything from this
// person moves to the one you pick: promises, conversations, circles, Venmo, voice memory.
import { Alert, FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import type { Person } from "../data/types";
import { colors } from "../theme";
import { Icon } from "./Icon";
import { Avatar, T } from "./ui";

export function MergeSheet({ person, visible, onClose, onMerged }: {
  person: Person; visible: boolean; onClose: () => void; onMerged: (keptId: string) => void;
}) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const first = person.name.split(" ")[0].toLowerCase();
  // Likely duplicates first (same first name), then everyone else.
  const others = s.people.filter((p) => p.id !== person.id)
    .sort((a, b) => Number(b.name.toLowerCase().split(" ")[0] === first) - Number(a.name.toLowerCase().split(" ")[0] === first) || a.name.localeCompare(b.name));

  function confirm(target: Person) {
    Alert.alert(`Merge “${person.name}” into “${target.name}”?`,
      `${person.name}'s promises, conversations, circles and voice memory move to ${target.name}. “${person.name}” disappears.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Merge", onPress: async () => {
            try {
              const id = await s.renamePerson(person.name, target.name);
              onClose();
              onMerged(id);
            } catch (e) {
              Alert.alert("Couldn't merge", (e as Error).message);
            }
          },
        },
      ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16, maxHeight: "75%" }}>
        <T w="extrabold" style={{ fontSize: 20 }}>Merge {person.name} with…</T>
        <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Pick the entry to keep. They&apos;re the same person.</T>
        <FlatList
          data={others}
          keyExtractor={(p) => p.id}
          style={{ marginTop: 10 }}
          ListEmptyComponent={<T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 10 }}>No one else to merge with.</T>}
          renderItem={({ item }) => {
            const likely = item.name.toLowerCase().split(" ")[0] === first;
            return (
              <Pressable accessibilityRole="button" accessibilityLabel={`Merge into ${item.name}`} onPress={() => confirm(item)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, borderBottomWidth: 1.5, borderBottomColor: colors.card }}>
                <Avatar name={item.name} size={40} color={s.personColor(item)} />
                <View style={{ flex: 1 }}>
                  <T w="extrabold" style={{ fontSize: 15 }}>{item.name}</T>
                  <T w="medium" style={{ fontSize: 12, color: likely ? colors.rust : colors.muted, marginTop: 2 }}>
                    {likely ? "Same first name · likely the same person" : item.lastHeard}
                  </T>
                </View>
                <Icon name="chevronRight" size={18} color={colors.grey} stroke={2.4} />
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
