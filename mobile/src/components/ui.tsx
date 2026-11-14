// Small building blocks shared by the screens.
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { avatarColors, colors, fonts } from "../theme";
import { Icon } from "./Icon";

export function T({ children, style, w = "bold", numberOfLines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; w?: keyof typeof fonts; numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts[w], color: colors.ink }, style]}>
      {children}
    </Text>
  );
}

export function Avatar({ name, size = 56, ring, badge, unknown }: {
  name: string | null; size?: number; ring?: string; badge?: number; unknown?: boolean;
}) {
  const { bg, fg } = avatarColors(name);
  if (ring) {
    // A coloured ring with a white gap, around a slightly smaller avatar.
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: ring, alignItems: "center", justifyContent: "center" }}>
        <Avatar name={name} size={size - 9} unknown={unknown} />
        {badge ? (
          <View style={[s.badge, { top: -6, right: -8 }]}>
            <T w="extrabold" style={{ fontSize: 11, color: colors.white }}>{badge}</T>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
        backgroundColor: unknown ? colors.white : bg,
        borderWidth: unknown ? 2 : 0, borderStyle: unknown ? "dashed" : "solid", borderColor: colors.dashed,
      }}
    >
      {unknown ? (
        <Icon name="question" size={size * 0.42} color={colors.ink} stroke={2.4} />
      ) : (
        <T w="extrabold" style={{ fontSize: size * 0.36, color: fg }}>{(name ?? "?").charAt(0).toUpperCase()}</T>
      )}
      {badge ? (
        <View style={s.badge}>
          <T w="extrabold" style={{ fontSize: 11, color: colors.white }}>{badge}</T>
        </View>
      ) : null}
    </View>
  );
}

export function RoundButton({ icon, label, onPress, bg = colors.card, color = colors.ink, size = 44 }: {
  icon: Parameters<typeof Icon>[0]["name"]; label: string; onPress?: () => void; bg?: string; color?: string; size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
    >
      <Icon name={icon} size={20} color={color} stroke={2.4} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon, iconLeft, style }: {
  label: string; onPress?: () => void; icon?: Parameters<typeof Icon>[0]["name"]; iconLeft?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [s.primary, { opacity: pressed ? 0.8 : 1 }, style]}
    >
      {icon && iconLeft ? <Icon name={icon} size={20} color={colors.white} stroke={2.4} /> : null}
      <T style={{ color: colors.white, fontSize: 16 }}>{label}</T>
      {icon && !iconLeft ? <Icon name={icon} size={18} color={colors.white} stroke={2.4} /> : null}
    </Pressable>
  );
}

export function SoftButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.soft, { opacity: pressed ? 0.7 : 1 }, style]}>
      <T style={{ fontSize: 14 }}>{label}</T>
    </Pressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
      <T style={{ fontSize: 14, color: colors.soft }}>{label}</T>
    </Pressable>
  );
}

export function Header({ title, light, right }: { title: string; light?: boolean; right?: ReactNode }) {
  return (
    <View style={s.header}>
      <RoundButton
        icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        bg={light ? "rgba(255,255,255,0.22)" : colors.card} color={light ? colors.white : colors.ink}
      />
      <T style={{ fontSize: 15, color: light ? colors.white : colors.ink }}>{title}</T>
      <View style={{ width: 44 }}>{right}</View>
    </View>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14 }}>
      <T style={{ fontSize: 13 }}>{label}</T>
    </View>
  );
}

export function QuoteBubble({ text, small }: { text: string; small?: boolean }) {
  return (
    <View style={[s.quote, small && { paddingVertical: 7, paddingLeft: 7 }]}>
      <View style={[s.quoteDot, small && { width: 22, height: 22, borderRadius: 11 }]}>
        <Icon name="wave" size={small ? 12 : 13} stroke={3} />
      </View>
      <T style={{ fontSize: small ? 12 : 13, flexShrink: 1 }} numberOfLines={2}>“{text}”</T>
    </View>
  );
}

export function Sheet({ children, top }: { children: ReactNode; top: number }) {
  return (
    <View style={[s.sheet, { marginTop: top }]}>
      <View style={s.handle} />
      {children}
    </View>
  );
}

export function money(n: number) {
  return "$" + n.toFixed(2);
}

const s = StyleSheet.create({
  badge: {
    position: "absolute", top: -6, right: -8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink,
    borderWidth: 2, borderColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  primary: {
    height: 58, borderRadius: 29, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  soft: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  header: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  quote: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderRadius: 20,
    paddingVertical: 8, paddingLeft: 8, paddingRight: 14, alignSelf: "flex-start", maxWidth: "100%",
  },
  quoteDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.orangeDot, alignItems: "center", justifyContent: "center" },
  sheet: {
    flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, paddingHorizontal: 22, paddingBottom: 24,
  },
  handle: { width: 56, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: "center", marginBottom: 22 },
});
