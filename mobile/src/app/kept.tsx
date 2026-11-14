// Kept promises tab: everything marked done.
import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "../components/BottomNav";
import { Icon, kindIcon } from "../components/Icon";
import { T } from "../components/ui";
import { useStore } from "../data/store";
import { colors, kindTile } from "../theme";

export default function Kept() {
  const { todos, person, setStatus } = useStore();
  const insets = useSafeAreaInsets();
  const kept = todos.filter((t) => t.status === "done");
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top + 60 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <T w="extrabold" style={{ fontSize: 36, letterSpacing: -1, lineHeight: 40 }}>Kept</T>
        <T w="medium" style={{ fontSize: 15, color: colors.muted, marginTop: 4 }}>
          {kept.length} promise{kept.length === 1 ? "" : "s"} kept
        </T>
      </View>
      <FlatList
        data={kept}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 140, gap: 10 }}
        ListEmptyComponent={<T w="medium" style={{ fontSize: 15, color: colors.muted, paddingHorizontal: 4 }}>Tick a promise on the Promises tab and it lands here.</T>}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/todo/[id]", params: { id: item.id } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 22, height: 72, paddingHorizontal: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: kindTile[item.kind], alignItems: "center", justifyContent: "center" }}>
              <Icon name={kindIcon[item.kind]} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" style={{ fontSize: 15, textDecorationLine: "line-through" }}>{item.title}</T>
              <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{person(item.personId)?.name ?? "Someone"}</T>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setStatus(item.id, "open")} hitSlop={6}
              style={{ backgroundColor: colors.white, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 }}>
              <T style={{ fontSize: 12 }}>Undo</T>
            </Pressable>
          </Pressable>
        )}
      />
      <BottomNav />
    </View>
  );
}
