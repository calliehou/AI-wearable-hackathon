// 08 · Promise heard: what the band heard, what kind of promise it is, who it's to, and when.
import * as Notifications from "expo-notifications";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, typeIcon } from "../../components/Icon";
import { Avatar, Header, PrimaryButton, T, TextButton, money } from "../../components/ui";
import { WhoPicker } from "../../components/WhoPicker";
import { useStore } from "../../data/store";
import type { PromiseType } from "../../data/types";
import { colors, TYPE_TONE } from "../../theme";

const TYPES: PromiseType[] = ["Money", "Gift", "Task", "Plan"];

export default function PromiseHeard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const t = s.todo(id);
  const [picking, setPicking] = useState(false);
  const [remind, setRemind] = useState(true);
  if (!t) return <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}><Header title="Promise" /></View>;
  const p = s.person(t.personId);
  const kind = t.type;

  async function save() {
    if (remind) {
      // A phone reminder (the band has no vibration motor): one hour from now as a gentle nudge.
      await Notifications.scheduleNotificationAsync({
        content: { title: p ? `Keep your promise to ${p.name.split(" ")[0]}` : "Keep your promise", body: `${t!.title} · due ${t!.dueLabel.toLowerCase()}`, data: { todoId: t!.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600 },
      }).catch(() => undefined);
    }
    if (kind === "Money" && p) router.push({ pathname: "/transfer/[id]", params: { id: t!.id } });
    else router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header title="Promise heard" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }}>
        <View style={{ height: 150, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: 260, height: 90, borderRadius: 130, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.ring, transform: [{ rotate: "-10deg" }] }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 70 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
              <T w="extrabold" style={{ fontSize: 15, color: colors.white }}>You</T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={p ? p.name : "Choose who this promise is with"} onPress={() => (p ? router.push({ pathname: "/person/[id]", params: { id: p.id } }) : setPicking(true))}>
              <Avatar name={p?.name ?? null} unknown={!p} size={64} color={s.personColor(p)} />
            </Pressable>
          </View>
          <View style={{ position: "absolute", top: 54, left: "48%", width: 14, height: 14, borderRadius: 7, backgroundColor: colors.satellite, borderWidth: 2, borderColor: colors.white }} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T w="extrabold" style={{ fontSize: 26, letterSpacing: -0.6 }}>Promise heard</T>
          <View style={{ backgroundColor: colors.ink, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 }}>
            <T style={{ fontSize: 12, color: colors.white }}>{Math.round(t.confidence * 100)}% sure</T>
          </View>
        </View>
        <View style={{ marginTop: 10, backgroundColor: colors.card, borderRadius: 20, padding: 14 }}>
          <T w="semibold" style={{ fontSize: 15, lineHeight: 21 }}>“{t.quote}”</T>
          <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>{t.heardAt} · {t.heardLabel}</T>
        </View>

        <T w="extrabold" style={{ fontSize: 15, marginTop: 20 }}>What kind of promise?</T>
        <View accessibilityLabel="Promise type" style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {TYPES.map((k) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: k === kind }} onPress={() => s.changePromise(t.id, { type: k })}
              style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: TYPE_TONE[k], borderWidth: 2, borderColor: k === kind ? colors.ink : "transparent", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 }}>
              <Icon name={typeIcon[k]} size={14} stroke={2.4} />
              <T w="extrabold" style={{ fontSize: 13 }}>{k}</T>
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={() => setPicking(true)}
          style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line }}>
          <Avatar name={p?.name ?? null} unknown={!p} size={44} color={s.personColor(p)} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" style={{ fontSize: 16 }}>{p ? `To ${p.name}` : "Who is this? Tap to choose"}</T>
            {t.personSource === "named" ? (
              <T style={{ fontSize: 12, color: colors.rust, marginTop: 2 }}>You said “{t.personName}” · tap to pick them from contacts</T>
            ) : (
              <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{p ? [p.circles[0], t.title].filter(Boolean).join(" · ") : "From your contacts"}</T>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {t.amount != null && <T w="extrabold" style={{ fontSize: 20 }}>{money(t.amount)}</T>}
            <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>Due {t.dueLabel.toLowerCase()}{t.dueDetail ? ` · ${t.dueDetail}` : ""}</T>
          </View>
        </Pressable>

        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: colors.card }}>
          <Icon name="bell" size={18} stroke={2.2} />
          <T w="extrabold" style={{ flex: 1, fontSize: 14 }}>Remind me on my phone</T>
          <Switch value={remind} onValueChange={setRemind} trackColor={{ true: colors.ink, false: colors.handle }} accessibilityLabel="Remind me on my phone" />
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />
        <PrimaryButton label={kind === "Money" && p ? "Save & set up transfer" : t.status === "done" ? "Done" : "Save"} onPress={save} />
        {t.status === "open" && kind !== "Money" && (
          <TextButton label="Mark as kept" onPress={() => { s.setStatus(t.id, "done"); router.replace({ pathname: "/kept/[id]", params: { id: t.id } }); }} />
        )}
        <TextButton label="That wasn't a promise" onPress={() => Alert.alert("Remove this promise?", "It disappears from your orbit.", [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => { s.setStatus(t.id, "dismissed"); router.back(); } },
        ])} />
      </ScrollView>
      <WhoPicker key={String(picking)} visible={picking} quote={t.quote}
        title={t.personSource === "named" ? `Which ${t.personName}?` : undefined}
        initialQuery={t.personSource === "named" ? t.personName ?? "" : ""}
        onClose={() => setPicking(false)} onPick={(n) => s.setTodoPerson(t.id, { name: n })} />
    </View>
  );
}
