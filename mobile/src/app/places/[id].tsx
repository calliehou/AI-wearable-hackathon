// 06 · Places together: places you and someone were, as mentioned in your conversations.
// (The band has no GPS; Peri reads the places from what was said.)
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { Header, T } from "../../components/ui";
import { fetchAbout, type About } from "../../data/api";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

const PIN = ["#F26A3D", "#F5A54A", "#7CC99A", "#6AB6E8", "#A993F0"];

export default function Places() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const p = s.person(id);
  const [about, setAbout] = useState<About | null>(null);
  const [error, setError] = useState("");
  const name = p?.name;
  useEffect(() => {
    if (!name) return;
    fetchAbout(name).then(setAbout).catch((e) => setError((e as Error).message));
  }, [name]);
  const first = p?.name.split(" ")[0] ?? "them";
  const places = about?.places ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header label={`Back to ${first}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
        <T w="extrabold" style={{ fontSize: 30, letterSpacing: -0.8 }}>You &amp; {first}</T>
        <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
          {places.length} place{places.length === 1 ? "" : "s"} from your conversations · never shared
        </T>

        <View style={{ marginTop: 18, height: 220, borderRadius: 26, backgroundColor: "#EEF3EC", overflow: "hidden", padding: 16 }}>
          <View style={{ position: "absolute", left: -40, top: 90, width: 480, height: 18, backgroundColor: "#FFFFFF", transform: [{ rotate: "-12deg" }] }} />
          <View style={{ position: "absolute", left: 130, top: -20, width: 16, height: 300, backgroundColor: "#FFFFFF", transform: [{ rotate: "8deg" }] }} />
          <View style={{ position: "absolute", right: 30, bottom: 20, width: 90, height: 60, borderRadius: 18, backgroundColor: "#D5E8D4" }} />
          {places.slice(0, 5).map((pl, i) => (
            <View key={pl.name} style={{ position: "absolute", left: 28 + ((i * 97) % 250), top: 28 + ((i * 61) % 140), alignItems: "center" }}>
              <View style={{ backgroundColor: colors.white, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, flexDirection: "row", gap: 6, alignItems: "center",
                shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: PIN[i % PIN.length], alignItems: "center", justifyContent: "center" }}>
                  <T w="extrabold" style={{ fontSize: 10, color: colors.white }}>{i + 1}</T>
                </View>
                <T style={{ fontSize: 11 }} numberOfLines={1}>{pl.name.split(",")[0]}</T>
              </View>
            </View>
          ))}
          {!about && !error && <ActivityIndicator style={{ marginTop: 80 }} color={colors.ink} />}
        </View>

        <View style={{ marginTop: 16, gap: 8 }}>
          {places.map((pl, i) => (
            <View key={pl.name + i} style={{ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 64, borderRadius: 20, backgroundColor: colors.card, paddingHorizontal: 14 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: PIN[i % PIN.length], alignItems: "center", justifyContent: "center" }}>
                <T w="extrabold" style={{ fontSize: 13, color: colors.white }}>{i + 1}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" style={{ fontSize: 15 }}>{pl.name}</T>
                <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{pl.when} · {pl.note}</T>
              </View>
            </View>
          ))}
          {about && !places.length && (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center", padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line }}>
              <Icon name="pin" size={18} color={colors.muted} />
              <T w="medium" style={{ flex: 1, fontSize: 13, color: colors.soft, lineHeight: 18 }}>
                No places yet. When you and {first} mention where you are or where you met, they show up here.
              </T>
            </View>
          )}
          {error ? <T w="medium" style={{ fontSize: 13, color: colors.muted }}>{error}</T> : null}
        </View>
      </ScrollView>
    </View>
  );
}
