// The promises with one person: still open, or already kept.
import { router } from "expo-router";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Todo } from "../data/types";
import { colors, TYPE_TONE } from "../theme";
import { Icon, typeIcon } from "./Icon";
import { T } from "./ui";

export function PromiseListSheet({ title, todos, empty, visible, onClose }: {
  title: string; todos: Todo[]; empty: string; visible: boolean; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16, maxHeight: "75%" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T w="extrabold" style={{ fontSize: 20 }}>{title}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={16} stroke={2.6} />
          </Pressable>
        </View>
        <FlatList
          data={todos}
          keyExtractor={(t) => t.id}
          style={{ marginTop: 10 }}
          contentContainerStyle={{ gap: 8 }}
          ListEmptyComponent={<T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>{empty}</T>}
          renderItem={({ item }) => {
            const kept = item.status === "done";
            return (
              <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: "/promise/[id]", params: { id: item.id } }); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, borderRadius: 18, backgroundColor: colors.card, paddingHorizontal: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: TYPE_TONE[item.type], alignItems: "center", justifyContent: "center" }}>
                  <Icon name={kept ? "tick" : typeIcon[item.type]} size={16} stroke={2.6} />
                </View>
                <View style={{ flex: 1 }}>
                  <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{item.title}</T>
                  <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                    {kept ? `Kept · ${item.heardLabel.replace("heard", "promised")}` : `Due ${item.dueLabel.toLowerCase()}${item.dueDetail ? " · " + item.dueDetail : ""}`}
                  </T>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
