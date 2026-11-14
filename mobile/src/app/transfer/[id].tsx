// 09 · Keep a promise: confirm a transfer. Prototype: no bank is connected, no money moves. // MOCK
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Header, PrimaryButton, T, money } from "../../components/ui";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

export default function Transfer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const [split, setSplit] = useState(false);
  const t = s.todo(id);
  if (!t) return <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}><Header title="Keep a promise" /></View>;
  const p = s.person(t.personId);
  const full = t.amount ?? 0;
  const amount = split ? full / 2 : full;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header title="Keep a promise" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 10 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <T w="extrabold" style={{ fontSize: 14, color: colors.white }}>You</T>
          </View>
          <View style={{ width: 60, height: 2, backgroundColor: colors.ring }} />
          <Avatar name={p?.name ?? null} unknown={!p} size={72} color={s.personColor(p)} />
        </View>
        <T w="extrabold" style={{ fontSize: 24, textAlign: "center", marginTop: 12 }}>{p?.name ?? "Someone"}</T>
        <T w="medium" style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 2 }}>Saved payee · •• 8821</T>

        <T w="extrabold" style={{ fontSize: 52, letterSpacing: -2, textAlign: "center", marginTop: 20 }}>{money(amount)}</T>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 10 }}>
          {[{ on: !split, label: `Full ${money(full)}`, set: false }, { on: split, label: `Split · ${money(full / 2)}`, set: true }].map((o) => (
            <Pressable key={o.label} accessibilityRole="radio" accessibilityState={{ checked: o.on }} onPress={() => setSplit(o.set)}
              style={{ height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: "center", backgroundColor: o.on ? colors.ink : colors.card }}>
              <T style={{ fontSize: 13, color: o.on ? colors.white : colors.ink }}>{o.label}</T>
            </Pressable>
          ))}
        </View>
        <T w="semibold" style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 12 }}>You promised this {t.heardLabel.replace("heard ", "")} at {t.heardAt}</T>

        <View style={{ marginTop: 18, borderWidth: 1.5, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 16 }}>
          {[["From", "Checking •• 4417"], ["Note", t.note ?? t.title], ["Arrives", "Instantly · $0 fee"]].map(([k, v], i) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 50, borderBottomWidth: i < 2 ? 1.5 : 0, borderBottomColor: colors.card }}>
              <T w="semibold" style={{ fontSize: 14, color: colors.muted }}>{k}</T>
              <T style={{ fontSize: 14 }} numberOfLines={1}>{v}</T>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />
        <PrimaryButton label={`Confirm & send ${money(amount)}`} icon="tick" iconLeft
          onPress={() => { s.setStatus(t.id, "done"); router.replace({ pathname: "/kept/[id]", params: { id: t.id, amount: String(amount) } }); }} />
        <T w="semibold" style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 10 }}>Nothing moves until you approve · demo: no bank connected</T>
      </ScrollView>
    </View>
  );
}
