// Vexo band tab: the band's status. Static for now; it will read the listener's live state. // MOCK
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import { T } from "../components/ui";
import { colors } from "../theme";

export default function Band() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top + 60, paddingHorizontal: 20 }}>
      <T w="extrabold" style={{ fontSize: 36, letterSpacing: -1, lineHeight: 40 }}>Vexo band</T>
      <T w="medium" style={{ fontSize: 15, color: colors.muted, marginTop: 4 }}>Vexo-HACK-24</T>
      <View style={{ marginTop: 24, borderRadius: 24, backgroundColor: colors.card, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Icon name="band" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="extrabold" style={{ fontSize: 16 }}>Listening</T>
            <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>Solid blue light: the microphone is on</T>
          </View>
        </View>
        <T w="medium" style={{ fontSize: 13, color: colors.soft, lineHeight: 19 }}>
          Your band hears promises like “I'll send you…” or “I'll call you…” and adds them to Promises. If it doesn't
          catch who you were talking to, the promise asks “Who is this?” so you can pick them from your contacts.
        </T>
      </View>
      <BottomNav />
    </View>
  );
}
