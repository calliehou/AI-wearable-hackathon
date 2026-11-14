// Screen 5 · Promise kept.
import { router, useLocalSearchParams } from "expo-router";
import { Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RingArt } from "../../components/Art";
import { Icon } from "../../components/Icon";
import { PrimaryButton, T, TextButton, money } from "../../components/ui";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

export default function Done() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todo, person } = useStore();
  const insets = useSafeAreaInsets();
  const t = todo(id);
  const p = person(t?.personId ?? null);
  const name = p?.name ?? "them";
  const amount = money(t?.amount ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.orange, paddingTop: insets.top }}>
      <T style={{ fontSize: 15, color: colors.white, textAlign: "center", marginTop: 14 }}>Transfer sent</T>
      <View style={{ alignItems: "center", marginTop: 8, height: 236 }}><RingArt size={224} done darker /></View>
      <View style={{ flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 16 }}>
        <View style={{ width: 56, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: "center", marginBottom: 18 }} />
        <T w="extrabold" style={{ fontSize: 32, letterSpacing: -0.8, textAlign: "center" }}>Promise kept!</T>
        <T w="medium" style={{ fontSize: 15, color: colors.soft, textAlign: "center", marginTop: 6 }}>
          <T w="bold" style={{ fontSize: 15 }}>{amount}</T> is on its way to {name}.
        </T>

        <View style={{ backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 18, marginTop: 18 }}>
          {[["To", `${name} · •• 8821`], ["From", "Checking •• 4417"], ["Arrives", "Within seconds"]].map(([k, v], i) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 48, borderBottomWidth: i < 2 ? 2 : 0, borderBottomColor: colors.white }}>
              <T w="semibold" style={{ fontSize: 14, color: colors.muted }}>{k}</T>
              <T style={{ fontSize: 14 }}>{v}</T>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 2, borderColor: colors.line, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, marginTop: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Icon name="band" size={18} color={colors.white} />
          </View>
          <T w="semibold" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>Your band will buzz once when {name.split(" ")[0]}'s transfer lands.</T>
        </View>

        <View style={{ flex: 1 }} />
        <PrimaryButton label="Back to Promises" onPress={() => router.replace("/")} />
        <TextButton label="Share receipt" onPress={() => Share.share({ message: `I sent ${name} ${amount}. Promise kept!` })} />
      </View>
    </View>
  );
}
