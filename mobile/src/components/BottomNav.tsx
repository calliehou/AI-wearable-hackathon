// The floating black bar: My orbit · Contacts · (hold) mic · Ask Peri · Vexo band.
import { router, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { Icon, type IconName } from "./Icon";

type Href = "/" | "/contacts" | "/ask" | "/band";
const LEFT: { icon: IconName; label: string; href: Href }[] = [
  { icon: "orbit", label: "My orbit", href: "/" },
  { icon: "contacts", label: "Contacts", href: "/contacts" },
];
const RIGHT: { icon: IconName; label: string; href: Href }[] = [
  { icon: "chat", label: "Ask Peri", href: "/ask" },
  { icon: "band", label: "Vexo band", href: "/band" },
];

export function BottomNav() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const tab = (t: { icon: IconName; label: string; href: Href }) => {
    const active = path === t.href;
    return (
      <Pressable key={t.href} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: active }}
        onPress={() => !active && router.replace(t.href)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name={t.icon} size={24} stroke={2} color={active ? colors.white : colors.grey} />
      </Pressable>
    );
  };
  return (
    <View style={{
      position: "absolute", left: 20, right: 20, bottom: Math.max(insets.bottom, 12) + 8, height: 68, borderRadius: 34,
      backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-around",
      shadowColor: colors.ink, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 10,
    }}>
      {LEFT.map(tab)}
      <Pressable accessibilityRole="button" accessibilityLabel="Hold to tell Peri a promise"
        onPress={() => router.push("/mic")} onLongPress={() => router.push({ pathname: "/mic", params: { hold: "1" } })}
        style={({ pressed }) => ({
          width: 58, height: 58, borderRadius: 29, backgroundColor: pressed ? colors.satellite : colors.white,
          alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "rgba(255,255,255,0.14)",
        })}>
        <Icon name="mic" size={24} stroke={2.2} />
      </Pressable>
      {RIGHT.map(tab)}
    </View>
  );
}

export const NAV_SPACE = 120; // keep content clear of the bar
