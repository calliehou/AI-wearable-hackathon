// 12 · Vexo band · privacy: is the band listening, pause it, today's counts, and what
// Peri does (and never does) with what it hears.
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, NAV_SPACE } from "../components/BottomNav";
import { Icon, type IconName } from "../components/Icon";
import { T } from "../components/ui";
import { useStore } from "../data/store";
import { colors } from "../theme";

export default function Band() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const on = !s.band.paused;
  const live = s.band.running && s.band.connected;
  const status = !s.band.running ? "The band listener isn't running on the Mac"
    : !s.band.connected ? "Band disconnected · reconnecting"
    : on ? "On · only listens for commitments" : "Paused · nothing is being heard";

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: NAV_SPACE }}>
        <T w="extrabold" style={{ fontSize: 34, letterSpacing: -1 }}>Your band</T>
        <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          Vexo-HACK-24 · {live ? "connected" : "not connected"}
        </T>

        <View style={{ height: 230, alignItems: "center", justifyContent: "center" }}>
          {live && on ? <Pulse /> : null}
          <View style={{ width: 150, height: 54, borderRadius: 27, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-12deg" }] }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: live && on ? "#3B82F6" : colors.muted }} />
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 22, backgroundColor: colors.card }}>
          <View style={{ flex: 1 }}>
            <T w="extrabold" style={{ fontSize: 16 }}>Listening for promises</T>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 8, backgroundColor: live && on ? colors.green : colors.muted }} />
              <T w="medium" style={{ fontSize: 13, color: colors.soft, flexShrink: 1 }}>{status}</T>
            </View>
          </View>
          <Pressable accessibilityRole="switch" accessibilityLabel="Listening for promises" accessibilityState={{ checked: on }}
            onPress={() => s.pauseBand(on)}
            style={{ width: 56, height: 34, borderRadius: 17, backgroundColor: on ? colors.ink : colors.handle, padding: 4 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, marginLeft: on ? 22 : 0 }} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line }}>
            <T w="extrabold" style={{ fontSize: 24 }}>{s.stats.promisesToday}</T>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>promises heard today</T>
          </View>
          <View style={{ flex: 1, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line }}>
            <T w="extrabold" style={{ fontSize: 24 }}>{s.stats.conversationsToday}</T>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>conversations</T>
          </View>
        </View>

        <View style={{ marginTop: 18, gap: 10 }}>
          <Promise icon="lock" text="Audio is never stored, only promises" />
          <Promise icon="chat" text="Others' words are summarized, never quoted" />
          <Promise icon="dollar" text="Money never moves without your approval" />
        </View>

        <View style={{ marginTop: 18, flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, padding: 14, borderRadius: 20, backgroundColor: colors.card }}>
            <T w="extrabold" style={{ fontSize: 13 }}>1 buzz</T>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>promise saved</T>
          </View>
          <View style={{ flex: 1, padding: 14, borderRadius: 20, backgroundColor: colors.card }}>
            <T w="extrabold" style={{ fontSize: 13 }}>Reminder</T>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>when it&apos;s due</T>
          </View>
        </View>
        <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 17 }}>
          Buzzes come from your phone: this Vexo band has no vibration motor, and its light stays solid blue while it listens.
        </T>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function Promise({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} stroke={2.4} />
      </View>
      <T w="semibold" style={{ flex: 1, fontSize: 14 }}>{text}</T>
    </View>
  );
}

function Pulse() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
      loop.start();
    });
    return () => loop?.stop();
  }, [t]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", width: 170, height: 170, borderRadius: 85, borderWidth: 3, borderColor: "rgba(59,130,246,0.45)",
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.4] }) }],
    }} />
  );
}
