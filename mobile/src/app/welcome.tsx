// 00 · Welcome: "Keep your people in orbit."
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PeriMark } from "../components/Icon";
import { Centered, Ring } from "../components/Orbit";
import { Avatar, PrimaryButton, SoftButton, T } from "../components/ui";
import { useStore } from "../data/store";
import { colors } from "../theme";
import { WELCOMED } from "../data/prefs";

const dot = (k: string) => ({ key: k, size: 12, node: <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.dot }} /> });

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { askContacts, people } = useStore();
  const names = people.map((p) => p.name);
  const pick = (i: number, fallback: string) => names[i] ?? fallback;

  async function done(next: "/" | "/band") {
    await AsyncStorage.setItem(WELCOMED, "1").catch(() => undefined);
    router.replace(next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={{ height: 390, alignItems: "center", justifyContent: "center" }}>
        <Centered size={360}>
          <Ring size={360} seconds={160} dashed items={[
            { key: "a", size: 44, node: <Avatar name={pick(2, "C")} size={44} color="#CDEBFB" /> },
            { key: "b", size: 40, node: <Avatar name={pick(3, "L")} size={40} color="#E3D9FF" /> },
            dot("x"),
          ]} />
          <Ring size={230} seconds={110} reverse items={[
            { key: "c", size: 52, node: <Avatar name={pick(0, "K")} size={52} color="#FFE3B8" /> },
            { key: "d", size: 50, node: <Avatar name={pick(1, "M")} size={50} color="#CDEBD6" /> },
          ]} />
          <View style={{ shadowColor: colors.ink, shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 16 } }}>
            <PeriMark size={120} />
          </View>
        </Centered>
      </View>

      <View style={{ alignItems: "center", paddingHorizontal: 28, marginTop: 6 }}>
        <T w="extrabold" style={{ fontSize: 44, letterSpacing: -2 }}>peri</T>
        <T style={{ fontSize: 20, letterSpacing: -0.4, marginTop: 4 }}>Keep your people in orbit.</T>
        <T w="medium" style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
          Your band hears the promises you make.{"\n"}Peri helps you keep them.
        </T>
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <PrimaryButton label="Connect your Vexo band" icon="band" iconLeft onPress={() => done("/band")} />
        <SoftButton label="Import contacts" onPress={async () => { await askContacts(); await done("/"); }} />
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 6 }}>
          <Icon name="lock" size={13} color={colors.muted} stroke={2.4} />
          <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>Audio is never stored</T>
        </View>
      </View>
    </View>
  );
}
