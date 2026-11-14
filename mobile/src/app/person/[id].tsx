// Screen 7 · Contact card + voice recap.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Speech from "expo-speech";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, kindIcon } from "../../components/Icon";
import { Avatar, Header, T } from "../../components/ui";
import { fetchRecap } from "../../data/api";
import { useStore } from "../../data/store";
import { colors, kindTile } from "../../theme";

const BARS = [10, 18, 26, 14, 22, 28, 12, 20, 26, 16, 24, 12, 28, 18, 10, 22, 14, 20];

export default function PersonCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { person, openFor, todos } = useStore();
  const insets = useSafeAreaInsets();
  const p = person(id);
  const [voice, setVoice] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [usingPhoneVoice, setUsingPhoneVoice] = useState(false);
  const player = useAudioPlayer();                 // plays the ElevenLabs recap from the Mac
  const status = useAudioPlayerStatus(player);
  useEffect(() => () => { Speech.stop(); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the player tells us the recap ended
    if (status.didJustFinish) setVoice(false);
  }, [status.didJustFinish]);
  if (!p) return <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}><Header title="Contact" /></View>;

  const open = openFor(p.id);
  const kept = todos.filter((t) => t.personId === p.id && t.status === "done").length;
  const first = p.name.split(" ")[0];
  const shownRecap = recap ?? `Recaps of your last week with ${first} appear here.`;

  async function toggle() {
    if (voice) { player.pause(); Speech.stop(); setVoice(false); return; }
    setPaused(false); setTranscript(false); setNote(""); setLoading(true);
    try {
      const r = await fetchRecap(p!.name);
      setRecap(r.text);
      setVoice(true);
      if (r.audio) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        player.replace({ uri: r.audio });
        player.seekTo(0);
        player.play();
        setUsingPhoneVoice(false);
      } else {
        // No ElevenLabs audio: the phone reads the recap itself.
        if (r.note) setNote(r.note);
        setUsingPhoneVoice(true);
        Speech.speak(r.text, { onDone: () => setVoice(false) });
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function togglePause() {
    if (usingPhoneVoice) {
      if (paused) Speech.resume(); else Speech.pause();
    } else if (paused) player.play(); else player.pause();
    setPaused(!paused);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header title="Contact" right={
        <Pressable accessibilityRole="button" accessibilityLabel="Edit contact" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <Icon name="edit" size={18} />
        </Pressable>
      } />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Avatar name={p.name} size={92} />
            <View style={{ position: "absolute", right: 0, bottom: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.orangeDot, borderWidth: 2, borderColor: colors.white, alignItems: "center", justifyContent: "center" }}>
              <Icon name="tick" size={14} stroke={3} />
            </View>
          </View>
          <T w="extrabold" style={{ fontSize: 26, letterSpacing: -0.6, marginTop: 10 }}>{p.name}</T>
          {(p.phone || p.relation) && (
            <T style={{ fontSize: 14, marginTop: 3 }}>
              {p.phone ? <T style={{ color: colors.rust, fontSize: 14 }}>{p.phone}</T> : null}
              {p.relation ? <T w="medium" style={{ color: colors.muted, fontSize: 14 }}>{p.phone ? " · " : ""}{p.relation}</T> : null}
            </T>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 22 }}>
          <Stat bold={String(open.length)} text=" open" />
          <Stat bold={String(kept)} text=" kept" />
          <Stat bold={p.lastHeard ?? "—"} text="" small />
        </View>

        {(p.phone || p.email) && (
          <View style={{ borderWidth: 2, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 16, marginTop: 12 }}>
            {p.phone ? <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`tel:${p.phone}`)}><Line k="Phone" v={p.phone} last={!p.email} /></Pressable> : null}
            {p.email ? <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${p.email}`)}><Line k="Email" v={p.email} last /></Pressable> : null}
          </View>
        )}

        {open.map((t) => (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/todo/[id]", params: { id: t.id } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 20, height: 60, paddingHorizontal: 16, marginTop: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: kindTile[t.kind], alignItems: "center", justifyContent: "center" }}>
              {t.kind === "money" ? <T w="extrabold" style={{ fontSize: 17 }}>$</T> : <Icon name={kindIcon[t.kind]} size={18} />}
            </View>
            <T w="extrabold" style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{t.title}</T>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 }}>
              <T style={{ fontSize: 12 }}>{t.dueLabel}</T>
            </View>
          </Pressable>
        ))}

        <Pressable accessibilityRole="button" accessibilityState={{ selected: voice }} onPress={toggle}
          style={{ height: 56, borderRadius: 28, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 12 }}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Icon name="speaker" size={20} color={colors.white} />}
          <T style={{ fontSize: 16, color: colors.white }}>{loading ? "Preparing recap…" : voice ? "Stop recap" : "Recent activity"}</T>
        </Pressable>

        {note ? <T w="semibold" style={{ fontSize: 12, color: colors.muted, marginTop: 8, textAlign: "center" }}>{note}</T> : null}
        {voice && (
          <View style={{ backgroundColor: "#FFF1E8", borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={paused ? "Resume recap" : "Pause recap"} onPress={togglePause}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                <Icon name={paused ? "play" : "pause"} size={18} color={colors.white} stroke={2.6} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 12, color: colors.muted }}>Last 7 days with {first} · in your earbuds</T>
                <Wave paused={paused} />
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: transcript }} onPress={() => setTranscript(!transcript)} style={{ height: 36, justifyContent: "center", marginTop: 6 }}>
              <T style={{ fontSize: 13, color: colors.soft }}>{transcript ? "Hide transcript" : "Show transcript"}</T>
            </Pressable>
            {transcript && <T w="medium" style={{ fontSize: 13, lineHeight: 19, color: colors.body }}>{shownRecap}</T>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ bold, text, small }: { bold: string; text: string; small?: boolean }) {
  return (
    <View style={{ flex: 1, height: 48, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", flexDirection: "row", paddingHorizontal: 6 }}>
      <T w="extrabold" style={{ fontSize: small ? 12 : 14 }} numberOfLines={1}>{bold}</T>
      {text ? <T w="medium" style={{ fontSize: 14, color: colors.muted }}>{text}</T> : null}
    </View>
  );
}

function Line({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 44, borderBottomWidth: last ? 0 : 2, borderBottomColor: colors.line }}>
      <T w="semibold" style={{ fontSize: 14, color: colors.muted }}>{k}</T>
      <T style={{ fontSize: 14 }}>{v}</T>
    </View>
  );
}

function Wave({ paused }: { paused: boolean }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (paused) { t.stopAnimation(); return; }
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [paused, t]);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 28, marginTop: 6 }}>
      {BARS.map((h, i) => {
        const phase = (i * 0.37) % 1;
        const scaleY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4 + phase * 0.3, 1 - phase * 0.3, 0.4 + phase * 0.3] });
        return <Animated.View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: colors.ink, transform: [{ scaleY }] }} />;
      })}
    </View>
  );
}
