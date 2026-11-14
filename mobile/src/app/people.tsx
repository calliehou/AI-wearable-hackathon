// Screen 8 · People + search.
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import { Avatar, T } from "../components/ui";
import { useStore } from "../data/store";
import { colors, fonts } from "../theme";

export default function People() {
  const { people, openFor, todos } = useStore();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;

  function sub(id: string, lastHeard?: string) {
    const open = openFor(id);
    if (open.length) return `${open.length} open · ${open[0].title}`;
    const kept = todos.filter((t) => t.personId === id && t.status === "done").length;
    return kept ? `Kept ${kept} promise${kept === 1 ? "" : "s"}` : lastHeard ?? "";
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top + 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add contact"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={20} stroke={2.4} />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
        <T w="extrabold" style={{ fontSize: 36, letterSpacing: -1, lineHeight: 40 }}>People</T>
        <T w="medium" style={{ fontSize: 15, color: colors.muted, marginTop: 4 }}>
          {q ? `${matches.length} ${matches.length === 1 ? "result" : "results"}` : `${people.length} contacts`}
        </T>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 18, height: 52, borderRadius: 26, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 18, paddingRight: 8 }}>
        <Icon name="search" size={20} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search by name" placeholderTextColor={colors.muted}
          accessibilityLabel="Search people by name"
          style={{ flex: 1, height: 48, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }} />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={14} stroke={3} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={matches}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <T w="extrabold" style={{ fontSize: 17 }}>No one named “{query.trim()}”</T>
            <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>Check the spelling or try just the first letters.</T>
          </View>
        }
        renderItem={({ item }) => {
          const n = openFor(item.id).length;
          return (
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/person/[id]", params: { id: item.id } })}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 70, borderBottomWidth: 2, borderBottomColor: colors.card }}>
              <Avatar name={item.name} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T w="extrabold" style={{ fontSize: 16 }}>{item.name}</T>
                <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{sub(item.id, item.lastHeard)}</T>
              </View>
              {n > 0 && (
                <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                  <T w="extrabold" style={{ fontSize: 12, color: colors.white }}>{n}</T>
                </View>
              )}
              <Icon name="chevronRight" size={18} color={colors.grey} stroke={2.4} />
            </Pressable>
          );
        }}
      />
      <BottomNav mic />
    </View>
  );
}
