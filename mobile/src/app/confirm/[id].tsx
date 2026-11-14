// Screen 4 · Confirm transfer. Prototype only: no money moves; the bank step is mocked. // MOCK
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { Avatar, Header, PrimaryButton, T, money } from "../../components/ui";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

export default function Confirm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todo, person, setStatus } = useStore();
  const insets = useSafeAreaInsets();
  const t = todo(id);
  const p = person(t?.personId ?? null);
  if (!t) return null;
  const amount = money(t.amount ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header title="Confirm transfer" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }}>
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Avatar name={p?.name ?? null} size={100} />
            <View style={{ position: "absolute", right: 0, bottom: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.white, alignItems: "center", justifyContent: "center" }}>
              <Icon name="tick" size={14} color={colors.white} stroke={3} />
            </View>
          </View>
          <T w="extrabold" style={{ fontSize: 26, letterSpacing: -0.6, marginTop: 14 }}>{p?.name ?? "Someone"}</T>
          <T style={{ fontSize: 14, marginTop: 4 }}>
            <T style={{ color: colors.rust, fontSize: 14 }}>Northline •• 8821</T>
            <T w="medium" style={{ color: colors.muted, fontSize: 14 }}> · saved payee</T>
          </T>
        </View>

        <View style={{ marginTop: 24, height: 84, borderWidth: 2, borderColor: colors.line, borderRadius: 42, alignItems: "center", justifyContent: "center" }}>
          <T w="extrabold" style={{ fontSize: 44, letterSpacing: -1.5 }}>{amount}</T>
        </View>
        <T w="semibold" style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 12 }}>You promised this {t.heardLabel.replace("heard ", "")} at {t.heardAt}</T>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
          {[["$0", " fee"], ["Instant", ""], ["•• 4417", ""]].map(([a, b]) => (
            <View key={a} style={{ flex: 1, height: 56, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
              <T w="extrabold" style={{ fontSize: 15 }}>{a}</T>
              {b ? <T w="medium" style={{ fontSize: 15, color: colors.muted }}>{b}</T> : null}
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16, borderWidth: 2, borderColor: colors.line, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 52, borderBottomWidth: 2, borderBottomColor: colors.line }}>
            <T w="semibold" style={{ fontSize: 14, color: colors.muted }}>From</T>
            <T style={{ fontSize: 14 }}>Northline Checking •• 4417</T>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 52 }}>
            <T w="semibold" style={{ fontSize: 14, color: colors.muted }}>For</T>
            <T style={{ fontSize: 14 }}>{t.note?.split(" ")[0] ?? "Promise"} · promised via band</T>
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        <PrimaryButton label={`Confirm & send $${t.amount ?? 0}`} icon="tick" iconLeft style={{ height: 60, borderRadius: 30 }}
          onPress={() => { setStatus(t.id, "done"); router.replace({ pathname: "/done/[id]", params: { id: t.id } }); }} />
        <T w="semibold" style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 10 }}>You'll approve with Face ID in your bank app</T>
      </ScrollView>
    </View>
  );
}
