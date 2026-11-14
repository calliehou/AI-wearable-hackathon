// Screen 1 · Promises list.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RingArt } from "../components/Art";
import { BottomNav } from "../components/BottomNav";
import { Icon, kindIcon } from "../components/Icon";
import { Avatar, QuoteBubble, T } from "../components/ui";
import { WhoPicker, WhoPill } from "../components/WhoPicker";
import { useStore } from "../data/store";
import type { Todo } from "../data/types";
import { colors, kindTile } from "../theme";

const TODAY = ["Tonight", "Today"];

export default function Promises() {
  const { todos, person, people, setStatus } = useStore();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState<string | null>(null);
  const open = todos.filter((t) => t.status === "open");
  const today = open.filter((t) => TODAY.includes(t.dueLabel));
  const featured = today.find((t) => t.kind === "money") ?? today[0];
  const rest = open.filter((t) => t !== featured);

  // People with something open, in order of their first open to-do.
  const withOpen = people
    .map((p) => ({ p, n: open.filter((t) => t.personId === p.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => open.findIndex((t) => t.personId === a.p.id) - open.findIndex((t) => t.personId === b.p.id));
  const unknown = open.filter((t) => !t.personId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 20 }}>
          <Pressable
            accessibilityRole="button" accessibilityLabel="Notifications"
            onPress={() => featured && router.push({ pathname: "/nudge/[id]", params: { id: featured.id } })}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="bell" size={20} stroke={2} />
            <View style={{ position: "absolute", top: 9, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.card }} />
          </Pressable>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#CDEBD6", alignItems: "center", justifyContent: "center" }}>
            <T w="extrabold" style={{ fontSize: 17 }}>M</T>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <T w="extrabold" style={{ fontSize: 36, letterSpacing: -1, lineHeight: 40 }}>Promises</T>
          <T w="medium" style={{ fontSize: 15, color: colors.muted, marginTop: 4 }}>
            {open.length} open · {today.length} due today
          </T>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4 }}>
          {withOpen.map(({ p, n }, i) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s contact card`}
              onPress={() => router.push({ pathname: "/person/[id]", params: { id: p.id } })}
              style={{ alignItems: "center", gap: 6, width: 60 }}>
              <Avatar name={p.name} size={56} badge={n} ring={i === 0 ? colors.orangeDot : undefined} />
              <T style={{ fontSize: 12 }} numberOfLines={1}>{p.name.split(" ")[0]}</T>
            </Pressable>
          ))}
          {unknown.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Choose who an unassigned promise is with"
              onPress={() => setPicking(unknown[0].id)} style={{ alignItems: "center", gap: 6, width: 60 }}>
              <Avatar name={null} unknown size={56} badge={unknown.length} />
              <T style={{ fontSize: 12, color: colors.muted }}>Who?</T>
            </Pressable>
          )}
          <View style={{ alignItems: "center", gap: 6, width: 60 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Add a promise"
              style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: "dashed", borderColor: colors.dashed, alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={20} stroke={2.4} />
            </Pressable>
            <T style={{ fontSize: 12, color: colors.muted }}>Add</T>
          </View>
        </ScrollView>

        {featured && (
          <>
            <T w="extrabold" style={{ fontSize: 14, marginTop: 18, marginLeft: 20 }}>Due today</T>
            <FeaturedCard todo={featured} name={person(featured.personId)?.name ?? null} onWho={() => setPicking(featured.id)} />
          </>
        )}

        {rest.length > 0 && <T w="extrabold" style={{ fontSize: 14, marginTop: 22, marginLeft: 20 }}>This week</T>}
        <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 10 }}>
          {rest.map((t) => (
            <Row key={t.id} todo={t} name={person(t.personId)?.name ?? null} onDone={() => setStatus(t.id, "done")} onWho={() => setPicking(t.id)} />
          ))}
        </View>
      </ScrollView>
      <BottomNav mic />
      {picking && <WhoPicker todoId={picking} visible onClose={() => setPicking(null)} />}
    </View>
  );
}

function FeaturedCard({ todo, name, onWho }: { todo: Todo; name: string | null; onWho: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/todo/[id]", params: { id: todo.id } })}
      style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 28, borderWidth: 1, borderColor: "#EFEFF2", backgroundColor: colors.white, overflow: "hidden",
        shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      <View style={{ height: 168, backgroundColor: "#F9C9C4", alignItems: "center", justifyContent: "center" }}>
        <RingArt size={150} />
        <View style={{ position: "absolute", top: 14, left: 14, right: 64 }}><QuoteBubble text={todo.quote} small /></View>
        <View style={{ position: "absolute", bottom: 14, left: 14, backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 11 }}>
          <T style={{ fontSize: 11, color: colors.white }}>Heard {todo.heardAt}</T>
        </View>
        <View style={{ position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: 12, backgroundColor: kindTile[todo.kind], alignItems: "center", justifyContent: "center" }}>
          {todo.kind === "money" ? <T w="extrabold" style={{ fontSize: 20 }}>$</T> : <Icon name={kindIcon[todo.kind]} size={20} />}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <T w="extrabold" style={{ fontSize: 18 }}>{todo.title}</T>
          {name ? (
            <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 3 }}>{todo.note ?? `with ${name}`}</T>
          ) : (
            <WhoPill onPress={onWho} />
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <T w="extrabold" style={{ fontSize: 20, letterSpacing: -0.4 }}>{todo.dueLabel}</T>
          {todo.dueDetail ? <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 3 }}>{todo.dueDetail}</T> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Row({ todo, name, onDone, onWho }: { todo: Todo; name: string | null; onDone: () => void; onWho: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 22, minHeight: 72, paddingLeft: 14, paddingRight: 16 }}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={`Mark ${todo.title} done`} onPress={onDone} hitSlop={8}
        style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: colors.greyRing, backgroundColor: colors.white }} />
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/todo/[id]", params: { id: todo.id } })}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingVertical: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: kindTile[todo.kind], alignItems: "center", justifyContent: "center" }}>
          <Icon name={kindIcon[todo.kind]} size={20} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{todo.title}</T>
          {name ? (
            <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{name} · {todo.heardLabel}</T>
          ) : (
            <WhoPill onPress={onWho} />
          )}
        </View>
        <View style={{ backgroundColor: colors.white, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }}>
          <T w="extrabold" style={{ fontSize: 12 }}>{todo.dueLabel}</T>
        </View>
      </Pressable>
    </View>
  );
}
