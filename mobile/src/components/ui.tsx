// Small building blocks shared by the screens.
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { avatarColors, colors, fonts } from "../theme";
import { Icon, type IconName } from "./Icon";

export function T({ children, style, w = "bold", numberOfLines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; w?: keyof typeof fonts; numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: fonts[w], color: colors.ink }, style]}>
      {children}
    </Text>
  );
}

export function Avatar({ name, size = 44, color, badge, ring, unknown, faded, border }: {
  name: string | null; size?: number; color?: string; badge?: number; ring?: boolean; unknown?: boolean; faded?: boolean; border?: boolean;
}) {
  const { bg } = avatarColors(name, color);
  return (
    <View style={{ width: size, height: size, opacity: faded ? 0.55 : 1 }}>
      <View
        style={{
          width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
          backgroundColor: unknown ? colors.white : bg,
          borderWidth: unknown ? 2 : ring || border ? 3 : 0, borderStyle: unknown ? "dashed" : "solid",
          borderColor: unknown ? colors.dashed : colors.white,
        }}
      >
        {unknown ? (
          <Icon name="question" size={size * 0.42} stroke={2.4} />
        ) : (
          <T w="extrabold" style={{ fontSize: size * 0.36 }}>{(name ?? "?").charAt(0).toUpperCase()}</T>
        )}
      </View>
      {ring ? <View pointerEvents="none" style={{ position: "absolute", top: -2.5, left: -2.5, right: -2.5, bottom: -2.5, borderRadius: size, borderWidth: 2.5, borderColor: colors.satellite }} /> : null}
      {badge ? (
        <View style={[s.badge, { top: -5, right: -7 }]}>
          <T w="extrabold" style={{ fontSize: 11, color: colors.white }}>{badge}</T>
        </View>
      ) : null}
    </View>
  );
}

export function RoundButton({ icon, label, onPress, bg = colors.card, color = colors.ink, size = 44, children }: {
  icon?: IconName; label: string; onPress?: () => void; bg?: string; color?: string; size?: number; children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
    >
      {icon ? <Icon name={icon} size={20} color={color} stroke={2.4} /> : children}
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon, iconLeft, style, disabled }: {
  label: string; onPress?: () => void; icon?: IconName; iconLeft?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.primary, { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
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
      <T style={{ fontSize: 15 }}>{label}</T>
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

export function back() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export function Header({ title, right, label = "Back" }: { title?: string; right?: ReactNode; label?: string }) {
  return (
    <View style={s.header}>
      <RoundButton icon="back" label={label} onPress={back} />
      {title ? <T style={{ fontSize: 15 }}>{title}</T> : <View />}
      <View style={{ minWidth: 44, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

export function Pill({ label, bg = colors.card, dot, onPress, selected, dashed }: {
  label: string; bg?: string; dot?: string; onPress?: () => void; selected?: boolean; dashed?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined} accessibilityState={selected !== undefined ? { selected } : undefined} onPress={onPress}
      style={{
        height: 34, borderRadius: 17, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: selected ? colors.ink : dashed ? colors.white : bg,
        borderWidth: dashed ? 1.5 : 0, borderStyle: "dashed", borderColor: colors.dashed,
      }}
    >
      {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} /> : null}
      {dashed ? <Icon name="plus" size={13} stroke={2.6} /> : null}
      <T style={{ fontSize: 13, color: selected ? colors.white : colors.ink }}>{label}</T>
    </Pressable>
  );
}

export function Section({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 20, marginTop: 22, marginBottom: 10 }}>
      <T w="extrabold" style={{ fontSize: 17 }}>{title}</T>
      {right}
    </View>
  );
}

export function QuoteBubble({ text, small }: { text: string; small?: boolean }) {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 16, paddingVertical: small ? 6 : 8, paddingHorizontal: 12, alignSelf: "flex-start", maxWidth: "100%" }}>
      <T style={{ fontSize: small ? 12 : 13 }} numberOfLines={2}>“{text}”</T>
    </View>
  );
}

export function money(n: number) {
  return "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

const s = StyleSheet.create({
  badge: {
    position: "absolute", minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink,
    borderWidth: 2, borderColor: colors.white, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  primary: {
    height: 56, borderRadius: 28, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  soft: { height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  header: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
});
