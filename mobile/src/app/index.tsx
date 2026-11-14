// 01 · My orbit (home): your people on three rings, closest in the middle; what's due today;
// this week's promises; and voices the band heard but couldn't name.
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, NAV_SPACE } from "../components/BottomNav";
import { Icon, PeriMark, typeIcon } from "../components/Icon";
import { Centered, Ring } from "../components/Orbit";
import { Avatar, Pill, Section, T } from "../components/ui";
import { WhoPicker } from "../components/WhoPicker";
import { useConfirmDelete } from "../components/Confirm";
import { DragList, type Handle } from "../components/DragList";
import { SwipeToDelete } from "../components/SwipeToDelete";
import { BurstLayer, useBurst } from "../components/Burst";
import type { UnknownVoice } from "../data/api";
import { useStore } from "../data/store";
import type { Person, Todo } from "../data/types";
import { CARD_TONE, CIRCLE_DOTS, colors } from "../theme";

const TODAY = ["Today", "Tonight"];
// Due within the next few days: tomorrow or a named weekday.
const WEEK = ["Tmrw", "Tomorrow", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "This week"];

export default function MyOrbit() {
  const s = useStore();
  const confirmDelete = useConfirmDelete();
  const insets = useSafeAreaInsets();
  const [circle, setCircle] = useState<string | null>(null);
  const [voice, setVoice] = useState<UnknownVoice | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [ordering, setOrdering] = useState<"today" | null>(null);
  const [dragging, setDragging] = useState(false);
  // Move a promise up/down (or left/right) within its section and save the new order.
  const move = (list: Todo[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((t) => t.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    s.reorder(ids);
  };
  const orderButton = (key: "today", n: number) => n > 1 ? (
    <Pressable accessibilityRole="button" onPress={() => setOrdering(ordering === key ? null : key)} hitSlop={8}
      style={{ height: 30, borderRadius: 15, paddingHorizontal: 12, justifyContent: "center", backgroundColor: ordering === key ? colors.ink : colors.card }}>
      <T style={{ fontSize: 12, color: ordering === key ? colors.white : colors.ink }}>{ordering === key ? "Done" : "Edit order"}</T>
    </Pressable>
  ) : null;

  const inCircle = (p?: Person) => !circle || !!p?.circles.includes(circle);
  const people = s.people.filter((p) => inCircle(p));
  const open = s.todos.filter((t) => t.status === "open" && (!circle || inCircle(s.person(t.personId))));
  const byRank = (a: Todo, b: Todo) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
  const today = open.filter((t) => TODAY.includes(t.dueLabel)).sort(byRank);
  const shown = s.todos.filter((t) => t.status !== "dismissed" && (!circle || inCircle(s.person(t.personId))));
  const week = shown.filter((t) => t.status === "open" && WEEK.includes(t.dueLabel)).sort(byRank);
  // Everything else: later or undated promises first, then the ones you kept.
  // Kept promises leave home (they're under "kept" on each person's card).
  const other = shown.filter((t) => t.status === "open" && !week.includes(t) && !TODAY.includes(t.dueLabel))
    .sort((a, b) => byRank(a, b) || b.heardIso.localeCompare(a.heardIso));
  const dueToday = new Set(today.map((t) => t.personId));

  const planet = (p: Person, size: number) => ({
    key: p.id, size,
    node: (
      <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}${p.open ? `, ${p.open} open` : ""}${p.drifting ? ", drifting" : ""}`}
        onPress={() => router.push({ pathname: "/person/[id]", params: { id: p.id } })}>
        <Avatar name={p.name} size={size} color={s.personColor(p)} badge={p.open || undefined} ring={dueToday.has(p.id)} faded={p.drifting} border={dueToday.has(p.id)} />
      </Pressable>
    ),
  });
  const dots = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `dot${i}`, size: 10, node: <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.dot }} /> }));
  const inner = people.filter((p) => p.ring === 1).slice(0, 5);
  const middle = people.filter((p) => p.ring === 2).slice(0, 6);
  const outer = people.filter((p) => p.ring === 3).slice(0, 7);
  const pickingTodo = picking ? s.todo(picking) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: NAV_SPACE }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={async () => { setPulling(true); await s.refresh(); setPulling(false); }} />}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <PeriMark size={26} bg={null} fg={colors.ink} />
            <T w="extrabold" style={{ fontSize: 22, letterSpacing: -1 }}>peri</T>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications and suggestions" onPress={() => router.replace("/ask")}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={20} stroke={2} />
              {s.recs.length > 0 && <View style={{ position: "absolute", top: 9, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.satellite, borderWidth: 2, borderColor: colors.card }} />}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Your Vexo band" onPress={() => router.replace("/band")}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
              <T w="extrabold" style={{ fontSize: 16, color: colors.white }}>M</T>
            </Pressable>
          </View>
        </View>

        <T w="extrabold" style={{ fontSize: 36, letterSpacing: -1.2, marginTop: 10, paddingHorizontal: 20 }}>My orbit</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 12 }}>
          <Pill label={`All ${s.people.length}`} selected={!circle} onPress={() => setCircle(null)} />
          {s.circles.map((c) => (
            <Pill key={c.name} label={c.name} dot={CIRCLE_DOTS[c.name] ?? c.color} selected={circle === c.name} onPress={() => setCircle(circle === c.name ? null : c.name)} />
          ))}
          <Pill label="Tag" dashed onPress={() => router.push("/circles")} />
        </ScrollView>

        {s.error && (
          <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: "#FFF1E8", borderRadius: 18, padding: 14 }}>
            <T w="extrabold" style={{ fontSize: 14 }}>Not connected to your band</T>
            <T w="medium" style={{ fontSize: 13, color: colors.soft, marginTop: 4, lineHeight: 18 }}>{s.error}</T>
          </View>
        )}

        <View style={{ height: 380, alignItems: "center", justifyContent: "center" }}>
          <Centered size={344}>
            <View style={{ position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: colors.glow }} />
            <Ring size={344} seconds={160} dashed items={[...outer.map((p) => planet(p, 36)), ...dots(Math.max(0, 3 - outer.length))]} />
            <Ring size={248} seconds={110} reverse items={middle.map((p) => planet(p, 44))} />
            <Ring size={148} seconds={70} items={inner.map((p) => planet(p, 52))} />
            <Pressable accessibilityRole="button" accessibilityLabel="You. Tap to edit your circles" onPress={() => router.push("/circles")}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center",
                shadowColor: colors.ink, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }}>
              <T w="extrabold" style={{ fontSize: 15, color: colors.white }}>You</T>
            </Pressable>
          </Centered>
          {!s.ready && !s.error && <ActivityIndicator style={{ position: "absolute" }} color={colors.ink} />}
        </View>

        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10,
          shadowColor: colors.ink, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: -6 }, elevation: 3 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.handle, alignSelf: "center" }} />

          <Section title={`Due today · ${today.length}`} right={orderButton("today", today.length)} />
          {today.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={312} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
              {today.map((t, i) => <DueCard key={t.id} todo={t} onWho={() => setPicking(t.id)}
                order={ordering === "today" ? { first: i === 0, last: i === today.length - 1, move: (d) => move(today, i, d) } : undefined} />)}
            </ScrollView>
          ) : (
            <T w="medium" style={{ fontSize: 14, color: colors.muted, paddingHorizontal: 20 }}>Nothing due today. Your band is listening for new promises.</T>
          )}

          <Section title={`This week · ${week.length}`} right={week.length > 1 ? <T style={{ fontSize: 12, color: colors.muted }}>Drag ⋮⋮ to reorder</T> : null} />
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <DragList items={week} keyOf={(t) => t.id} onDragging={setDragging} onReorder={(ids) => s.reorder(ids)}
              render={(t, handle) => <WeekRow todo={t} onWho={() => setPicking(t.id)} handle={handle} />} />
            {!week.length && <T w="medium" style={{ fontSize: 14, color: colors.muted, paddingHorizontal: 4 }}>Nothing else due this week.</T>}
          </View>

          <Section title={`Later · ${other.length}`} right={other.length > 1 ? <T style={{ fontSize: 12, color: colors.muted }}>Drag ⋮⋮ to reorder</T> : null} />
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <DragList items={other} keyOf={(t) => t.id} onDragging={setDragging} onReorder={(ids) => s.reorder(ids)}
              render={(t, handle) => (
                <SwipeToDelete label={`Delete ${t.title}`} onDelete={(reset) => confirmDelete(t, undefined, reset)}>
                  <WeekRow todo={t} onWho={() => setPicking(t.id)} handle={handle} swipe />
                </SwipeToDelete>
              )} />
            {!other.length && <T w="medium" style={{ fontSize: 14, color: colors.muted, paddingHorizontal: 4 }}>Nothing later.</T>}
          </View>

          {s.unknownVoices.length > 0 && (
            <>
              <Section title="Who is this?" />
              <T w="medium" style={{ fontSize: 12, color: colors.muted, paddingHorizontal: 20, marginTop: -6 }}>Name a voice once and your band recognises it from then on.</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingTop: 10 }}>
                {s.unknownVoices.map((v) => (
                  <Pressable key={`${v.interaction_id}-${v.speaker}`} accessibilityRole="button" accessibilityLabel={`Name the voice that said: ${v.quote}`}
                    onPress={() => setVoice(v)} style={{ width: 240, backgroundColor: colors.card, borderRadius: 22, padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Avatar name={null} unknown size={34} />
                      <T w="semibold" style={{ flex: 1, fontSize: 12, color: colors.muted }} numberOfLines={1}>{v.heard} · {v.title}</T>
                    </View>
                    <T w="semibold" style={{ fontSize: 14, lineHeight: 19 }} numberOfLines={3}>“{v.quote}”</T>
                    <View style={{ alignSelf: "flex-start", backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12 }}>
                      <T style={{ fontSize: 12, color: colors.white }}>Who is this?</T>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

        </View>
      </ScrollView>
      <BottomNav />
      <WhoPicker visible={!!voice} title="Whose voice is this?" quote={voice?.quote} onClose={() => setVoice(null)} onPick={(n) => voice && s.nameVoice(voice, n)} />
      <WhoPicker key={picking ?? "none"} visible={!!picking} quote={pickingTodo?.quote}
        title={pickingTodo?.personSource === "named" ? `Which ${pickingTodo.personName}?` : undefined}
        initialQuery={pickingTodo?.personSource === "named" ? pickingTodo.personName ?? "" : ""}
        onClose={() => setPicking(null)} onPick={(n) => picking && s.setTodoPerson(picking, { name: n })} />
    </View>
  );
}

function DueCard({ todo, onWho, order }: { todo: Todo; onWho: () => void; order?: Order }) {
  const s = useStore();
  const confirmDelete = useConfirmDelete();
  const p = s.person(todo.personId);
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Long press to delete" onPress={() => router.push({ pathname: "/promise/[id]", params: { id: todo.id } })}
      onLongPress={() => confirmDelete(todo)}
      style={{ width: 300, borderRadius: 26, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, overflow: "hidden",
        shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
      <View style={{ height: 150, backgroundColor: CARD_TONE[todo.type], alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 190, height: 70, borderRadius: 95, borderWidth: 1.5, borderColor: "rgba(17,17,17,0.16)", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
          {p ? <T w="extrabold" style={{ fontSize: 24 }}>{p.name.charAt(0)}</T> : <Icon name="question" size={26} stroke={2.4} />}
        </View>
        <View style={{ position: "absolute", top: 40, right: 92, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.satellite, borderWidth: 2, borderColor: colors.white }} />
        <View style={{ position: "absolute", top: 12, left: 12, right: 70, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 }}>
          <T style={{ fontSize: 12 }} numberOfLines={1}>“{todo.quote}”</T>
        </View>
        {order ? (
          <View style={{ position: "absolute", top: 10, right: 10 }}><Arrows order={order} horizontal /></View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${todo.title}`} onPress={() => confirmDelete(todo)} hitSlop={8}
            style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={13} color={colors.soft} stroke={2.6} />
          </Pressable>
        )}
        <View style={{ position: "absolute", bottom: 12, left: 12, backgroundColor: colors.ink, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, flexDirection: "row", gap: 4, alignItems: "center" }}>
          <Icon name={typeIcon[todo.type]} size={11} color={colors.white} stroke={2.6} />
          <T style={{ fontSize: 11, color: colors.white }}>{todo.type}</T>
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flex: 1 }}>
          <T w="extrabold" style={{ fontSize: 17 }} numberOfLines={1}>{todo.title}</T>
          {todo.personSource === "named" ? (
            <Pressable accessibilityRole="button" onPress={onWho} hitSlop={8}><T style={{ fontSize: 12, color: colors.rust, marginTop: 2 }}>Pick {todo.personName} from contacts</T></Pressable>
          ) : p ? (
            <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{todo.note ?? `to ${p.name}`}</T>
          ) : (
            <Pressable accessibilityRole="button" onPress={onWho} hitSlop={8}><T style={{ fontSize: 12, color: colors.rust, marginTop: 2 }}>Who is this? Tap to choose</T></Pressable>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <T w="extrabold" style={{ fontSize: 17 }}>{todo.dueLabel}</T>
          <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{todo.dueDetail ?? "Anytime"}</T>
        </View>
      </View>
    </Pressable>
  );
}

type Order = { first: boolean; last: boolean; move: (dir: -1 | 1) => void };

function Arrows({ order, horizontal }: { order: Order; horizontal?: boolean }) {
  const btn = (dir: -1 | 1, disabled: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={dir < 0 ? (horizontal ? "Move left" : "Move up") : (horizontal ? "Move right" : "Move down")}
      disabled={disabled} onPress={() => order.move(dir)} hitSlop={6}
      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, opacity: disabled ? 0.2 : 1, alignItems: "center", justifyContent: "center",
        transform: [{ rotate: horizontal ? (dir < 0 ? "90deg" : "-90deg") : dir < 0 ? "180deg" : "0deg" }] }}>
      <Icon name="chevronDown" size={16} color={colors.white} stroke={2.8} />
    </Pressable>
  );
  return <View style={{ flexDirection: horizontal ? "row" : "column", gap: 4 }}>{btn(-1, order.first)}{btn(1, order.last)}</View>;
}

function WeekRow({ todo, onWho, order, handle, swipe }: { todo: Todo; onWho: () => void; order?: Order; handle?: Handle; swipe?: boolean }) {
  const s = useStore();
  const confirmDelete = useConfirmDelete();
  const p = s.person(todo.personId);
  const burst = useBurst();
  const done = todo.status === "done" || burst.active;
  function tick() {
    if (todo.status === "done") { s.setStatus(todo.id, "open"); return; }
    // Bubble burst, then it's saved as kept and leaves the list.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    burst.play(() => s.setStatus(todo.id, "done"));
  }
  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 70, paddingLeft: 12, paddingRight: 10, borderRadius: 22,
      backgroundColor: colors.card, opacity: todo.status === "done" ? 0.55 : 1, zIndex: burst.active ? 20 : 0 }, burst.rowStyle]}>
      {burst.active && <BurstLayer t={burst.t} x={26} y={35} />}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`${done ? "Mark not done" : "Mark done"}: ${todo.title}`}
        onPress={tick} disabled={burst.active} hitSlop={8}
        style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: done ? colors.ink : colors.greyRing, backgroundColor: done ? colors.ink : colors.white, alignItems: "center", justifyContent: "center" }}>
        {done && <Icon name="tick" size={14} color={colors.white} stroke={3} />}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityHint="Long press to delete" onPress={() => router.push({ pathname: "/promise/[id]", params: { id: todo.id } })}
        onLongPress={() => confirmDelete(todo)}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 70, paddingVertical: 8 }}>
        <Avatar name={p?.name ?? null} unknown={!p} size={38} color={s.personColor(p)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w="extrabold" style={{ fontSize: 15, textDecorationLine: done ? "line-through" : "none" }} numberOfLines={1}>{todo.title}</T>
          {todo.personSource === "named" ? (
            <Pressable accessibilityRole="button" onPress={onWho} hitSlop={6}><T style={{ fontSize: 12, color: colors.rust, marginTop: 2 }}>Pick {todo.personName} from contacts</T></Pressable>
          ) : p ? (
            <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{[p.circles[0], todo.heardLabel].filter(Boolean).join(" · ")}</T>
          ) : (
            <Pressable accessibilityRole="button" onPress={onWho} hitSlop={6}><T style={{ fontSize: 12, color: colors.rust, marginTop: 2 }}>Who is this?</T></Pressable>
          )}
        </View>
        <View style={{ backgroundColor: colors.white, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }}>
          <T w="extrabold" style={{ fontSize: 12 }}>{done ? "Kept" : todo.dueLabel}</T>
        </View>
      </Pressable>
      {handle ? (
        <View {...handle.handlers} accessibilityLabel={`Drag to reorder ${todo.title}`} hitSlop={8}
          style={{ width: 30, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: handle.dragging ? colors.white : "transparent" }}>
          <Icon name="grip" size={18} color={handle.dragging ? colors.ink : colors.grey} />
        </View>
      ) : null}
      {order ? <Arrows order={order} /> : swipe ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${todo.title}`} onPress={() => confirmDelete(todo)} hitSlop={8}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={13} color={colors.muted} stroke={2.6} />
        </Pressable>
      )}
    </Animated.View>
  );
}
