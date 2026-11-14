// 10 · Promise kept.
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { Avatar, PrimaryButton, T, TextButton, money } from "../../components/ui";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

export default function Kept() {
  const { id, amount } = useLocalSearchParams<{ id: string; amount?: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const t = s.todo(id);
  const p = s.person(t?.personId ?? null);
  const first = p?.name.split(" ")[0] ?? "them";
  const [pop] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [pop]);
  const sent = amount ? Number(amount) : t?.amount;
  const keptWith = p ? s.todos.filter((x) => x.personId === p.id && x.status === "done").length : 0;
  const stillOpen = p ? s.openFor(p.id).length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
      <View style={{ alignItems: "center", height: 220, justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: colors.glow }} />
        <View style={{ position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderColor: colors.line }} />
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Avatar name={p?.name ?? "?"} size={88} color={s.personColor(p)} />
          <View style={{ position: "absolute", right: -4, bottom: -4, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.satellite, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center" }}>
            <Icon name="tick" size={16} stroke={3} />
          </View>
        </Animated.View>
      </View>
      <T w="extrabold" style={{ fontSize: 34, letterSpacing: -1, textAlign: "center" }}>Promise kept</T>
      <T w="medium" style={{ fontSize: 15, color: colors.soft, textAlign: "center", marginTop: 6 }}>
        {sent ? <><T style={{ fontSize: 15 }}>{money(sent)}</T> is on its way to {first}</> : `${t?.title ?? "Done"} · ${first} will be glad`}
      </T>
      <View style={{ marginTop: 22, borderRadius: 22, backgroundColor: colors.card, padding: 16 }}>
        <T w="extrabold" style={{ fontSize: 15 }}>{first} stays in your inner orbit</T>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 12 }}>
            <T w="extrabold" style={{ fontSize: 22 }}>{keptWith}</T>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>kept with {first}</T>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 12 }}>
            <T w="extrabold" style={{ fontSize: 22 }}>{stillOpen}</T>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>still open</T>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line }}>
        <Icon name="bell" size={18} />
        <T w="semibold" style={{ flex: 1, fontSize: 13 }}>Your phone will buzz once when it lands</T>
      </View>
      <View style={{ flex: 1 }} />
      <PrimaryButton label="Back to my orbit" onPress={() => router.replace("/")} />
      {p ? <TextButton label={`Open ${first}'s card`} onPress={() => router.replace({ pathname: "/person/[id]", params: { id: p.id } })} /> : null}
    </View>
  );
}
