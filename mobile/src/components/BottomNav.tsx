// The floating black tab bar from the design.
import { router, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { Icon, type IconName } from "./Icon";

const TABS: { icon: IconName; label: string; href: "/" | "/people" | "/kept" | "/band" }[] = [
  { icon: "home", label: "Promises", href: "/" },
  { icon: "people", label: "People", href: "/people" },
  { icon: "check", label: "Kept promises", href: "/kept" },
  { icon: "band", label: "Vexo band", href: "/band" },
];

export function BottomNav({ mic }: { mic?: boolean }) {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12) + 10;
  return (
    <>
    <View
      style={{
        position: "absolute", left: mic ? 20 : 65, right: mic ? 106 : 65, bottom, height: 64, borderRadius: 32,
        backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-around",
        shadowColor: colors.ink, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 10,
      }}
    >
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Pressable
            key={t.href} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: active }}
            onPress={() => !active && router.replace(t.href)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={t.icon} size={24} stroke={2} color={active ? colors.white : colors.grey}
              fill={active && t.icon !== "band" ? colors.white : "none"} />
          </Pressable>
        );
      })}
    </View>
    {mic && (
      <Pressable
        accessibilityRole="button" accessibilityLabel="Add a promise by voice" onPress={() => router.push("/record")}
        style={({ pressed }) => ({
          position: "absolute", right: 20, bottom, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.orangeDot,
          alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1,
          shadowColor: colors.orangeDot, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 10,
        })}
      >
        <Icon name="mic" size={26} stroke={2.4} />
      </Pressable>
    )}
    </>
  );
}
