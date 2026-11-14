// Screen 3 · Nudge + bank notification (a preview of what the lock screen shows at the due time).
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { T } from "../../components/ui";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

export default function Nudge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todo, person, todos } = useStore();
  const insets = useSafeAreaInsets();
  const t = todo(id);
  const p = person(t?.personId ?? null);
  const other = todos.find((x) => x.status === "open" && x.id !== id && x.kind === "send" && x.personId);
  const otherPerson = person(other?.personId ?? null);
  const first = p?.name.split(" ")[0] ?? "them";
  const date = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <View style={{ flex: 1, backgroundColor: colors.blush, paddingTop: insets.top + 16 }}>
      <View style={{ alignItems: "center" }}>
        <T style={{ fontSize: 18, marginTop: 8 }}>{date}</T>
        <T w="extrabold" style={{ fontSize: 100, letterSpacing: -4, lineHeight: 104, marginTop: 2 }}>{t?.dueDetail?.replace(/ ?[AP]M/i, "") ?? "8:00"}</T>
      </View>

      <View style={{ marginTop: 40, paddingHorizontal: 16 }}>
        {t && (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/confirm/[id]", params: { id: t.id } })}
            style={{ backgroundColor: colors.white, borderRadius: 28, padding: 16, shadowColor: "#78281E", shadowOpacity: 0.14, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.orangeDot, alignItems: "center", justifyContent: "center" }}>
                <Icon name="wave" size={16} stroke={3} />
              </View>
              <T style={{ flex: 1, fontSize: 12, color: colors.muted, letterSpacing: 0.4 }}>PERI · NORTHLINE BANK</T>
              <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>now</T>
            </View>
            <T w="extrabold" style={{ fontSize: 20, letterSpacing: -0.4, marginTop: 14 }}>Keep your promise to {first}</T>
            <T w="medium" style={{ fontSize: 15, color: colors.body, lineHeight: 22, marginTop: 6 }}>
              Send <T w="extrabold" style={{ fontSize: 15 }}>${t.amount ?? 0}</T>{t.note ? ` for the ${t.note.split(" ")[0].toLowerCase()}` : ""}? Review and confirm from Checking •• 4417.
            </T>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <View style={{ flex: 1.4, height: 48, borderRadius: 24, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontSize: 14, color: colors.white }}>Review &amp; confirm</T>
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.back()}
                style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontSize: 14 }}>Later</T>
              </Pressable>
            </View>
            <T w="semibold" style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 12 }}>Face ID required. Nothing moves until you approve.</T>
          </Pressable>
        )}

        {other && otherPerson && (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/todo/[id]", params: { id: other.id } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#CDEBFB", alignItems: "center", justifyContent: "center" }}>
              <Icon name="send" size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <T w="extrabold" style={{ fontSize: 14 }}>{otherPerson.name} is waiting on {other.title.replace(/^Send /, "")}</T>
              <T w="medium" style={{ fontSize: 13, color: colors.soft, marginTop: 2 }}>You said you'd do it {other.dueLabel === "Mon" ? "Monday" : other.dueLabel}</T>
            </View>
          </Pressable>
        )}
      </View>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 40, alignItems: "center" }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: "rgba(17,17,17,0.55)", justifyContent: "center" }}>
          <T style={{ fontSize: 14, color: colors.white }}>Close preview</T>
        </Pressable>
      </View>
    </View>
  );
}
