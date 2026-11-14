// 11 · Gift ideas: "Gifts Kelly would actually love", from what came up in your talks.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Header, PrimaryButton, T, TextButton } from "../../components/ui";
import { fetchGifts, type Gifts } from "../../data/api";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

const TONES = ["#CDEBD6", "#FFE3B8", "#E3D9FF", "#CDEBFB", "#F9C9C4"];

export default function GiftIdeas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const p = s.person(id);
  const [gifts, setGifts] = useState<Gifts | null>(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState(0);
  const name = p?.name;
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!name) return;
    let live = true;
    fetchGifts(name).then((g) => live && setGifts(g)).catch((e) => live && setError((e as Error).message));
    return () => { live = false; };
  }, [name, nonce]);
  const load = () => { setGifts(null); setError(""); setNonce((n) => n + 1); };
  const first = p?.name.split(" ")[0] ?? "them";
  const gift = s.todos.find((t) => t.personId === id && t.type === "Gift" && t.status === "open");

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header label={`Back to ${first}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={p?.name ?? "?"} size={48} color={s.personColor(p)} />
          <T style={{ fontSize: 14, color: colors.muted }}>{gifts?.occasion ?? "A little something"}</T>
        </View>
        <T w="extrabold" style={{ fontSize: 30, letterSpacing: -0.8, marginTop: 12, lineHeight: 34 }}>Gifts {first} would actually love</T>
        <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          From {gifts?.count ?? "…"} conversation{gifts?.count === 1 ? "" : "s"} · only you see this
        </T>

        {!gifts && !error && <ActivityIndicator style={{ marginTop: 40 }} color={colors.ink} />}
        {error ? <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 20 }}>{error}</T> : null}

        <View style={{ gap: 10, marginTop: 18 }}>
          {(gifts?.ideas ?? []).map((g, i) => (
            <Pressable key={g.title} accessibilityRole="radio" accessibilityState={{ checked: pick === i }} onPress={() => setPick(i)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: TONES[i % TONES.length],
                borderWidth: 2.5, borderColor: pick === i ? colors.ink : "transparent" }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
                <T w="extrabold" style={{ fontSize: 14 }}>{i + 1}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" style={{ fontSize: 16 }}>{g.title}</T>
                <T w="medium" style={{ fontSize: 13, color: colors.soft, marginTop: 2 }}>{g.why}</T>
              </View>
              <T w="extrabold" style={{ fontSize: 15 }}>{g.price}</T>
            </Pressable>
          ))}
        </View>

        {gifts?.said && (
          <View style={{ marginTop: 16, padding: 16, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line }}>
            <T style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.6 }}>WHAT {first.toUpperCase()} SAID</T>
            <T w="semibold" style={{ fontSize: 14, marginTop: 6, lineHeight: 20 }}>{gifts.said}</T>
          </View>
        )}

        <View style={{ flex: 1, minHeight: 20 }} />
        <PrimaryButton label="Plan it · remind me" disabled={!gifts?.ideas.length} onPress={() => {
          const idea = gifts?.ideas[pick];
          if (gift && idea) s.changePromise(gift.id, { title: `${idea.title} for ${first}` });
          Alert.alert("Planned", idea ? `${idea.title} for ${first}. Peri will remind you before it's due.` : "Saved.");
          router.back();
        }} />
        <TextButton label="Show more ideas" onPress={load} />
      </ScrollView>
    </View>
  );
}
