// 13 · Hold mic · tell a promise: hold the button, say one or more promises, let go.
// The Mac transcribes (Deepgram) and sorts it into promises (Claude).
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, typeIcon } from "../components/Icon";
import { Avatar, Header, PrimaryButton, SoftButton, T, TextButton } from "../components/ui";
import { parsePromises, type Parsed } from "../data/api";
import { useStore } from "../data/store";
import { colors, fonts, TYPE_TONE } from "../theme";

type Step = "ready" | "listening" | "working" | "done";
const TYPE: Record<string, string> = { money: "Money", gift: "Gift", task: "Task", plan: "Plan", call: "Plan" };

export default function Mic() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [step, setStep] = useState<Step>("ready");
  const [quote, setQuote] = useState("");
  const [found, setFound] = useState<Parsed[]>([]);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);

  // Recording state lives in refs too: presses arrive faster than React re-renders, and the
  // first press may be interrupted by the microphone permission prompt.
  const recording = useRef(false);
  const starting = useRef(false);
  const pressedAt = useRef(0);
  const [tapMode, setTapMode] = useState(false);

  useEffect(() => {
    // Ask for the microphone as soon as the screen opens, not in the middle of a press.
    AudioModule.requestRecordingPermissionsAsync()
      .then((perm) => { if (!perm.granted) { setError("Peri needs the microphone. Allow it in Settings, or type instead."); setTyping(true); } })
      .catch(() => undefined);
    return () => { if (recording.current) recorder.stop().catch(() => undefined); };
  }, [recorder]);

  async function start() {
    if (recording.current || starting.current) return;
    starting.current = true;
    setError("");
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setError("Peri needs the microphone. Allow it in Settings, or type instead."); setTyping(true); return; }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recording.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      setStep("listening");
    } catch (e) {
      setError(`Couldn't start the microphone (${(e as Error).message}). You can type instead.`);
      setTyping(true);
    } finally {
      starting.current = false;
    }
  }

  function pressIn() {
    pressedAt.current = Date.now();
    if (recording.current) { finish(); return; }   // tap mode: this tap stops it
    start();
  }

  function pressOut() {
    const held = Date.now() - pressedAt.current;
    if (recording.current && held >= 700) { finish(); return; }   // hold and release
    // A short tap (or the permission prompt interrupted the hold): keep listening until the next tap.
    setTapMode(true);
  }

  async function finish(text?: string) {
    if (!text && !recording.current) return;
    recording.current = false;
    setTapMode(false);
    setStep("working");
    try {
      let uri: string | undefined;
      if (!text) {
        await recorder.stop();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        uri = recorder.uri ?? undefined;
      }
      const r = await parsePromises({ uri, text }, s.people.map((p) => p.name));
      setQuote(r.quote);
      setFound(r.promises);
      setStep("done");
      if (!r.promises.length) setError("That didn't sound like a promise to someone. Try again with who it's for.");
    } catch (e) {
      setError((e as Error).message);
      setStep("ready");
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      await s.addPromises(found.map((p) => ({
        title: p.title, quote, kind: p.kind, amount: p.amount, due_label: p.due_label, due_detail: p.due_detail, person_name: p.person_name,
        due_date: p.due_date, due_time: p.due_time,
      })));
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const listening = step === "listening";
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <Header title={listening ? "Listening…" : step === "done" ? "Got it" : "Tell Peri a promise"} label="Close" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 120, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: 220, height: 80, borderRadius: 110, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.ring, transform: [{ rotate: "-10deg" }] }} />
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <T w="extrabold" style={{ fontSize: 15, color: colors.white }}>You</T>
          </View>
        </View>

        {step === "done" || quote ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 14 }}>
            <T w="semibold" style={{ fontSize: 15, lineHeight: 21 }}>“{quote}”</T>
          </View>
        ) : (
          <T w="medium" style={{ fontSize: 15, color: colors.soft, textAlign: "center", lineHeight: 22 }}>
            {listening ? (tapMode ? "Say who it's for and what you promised, then tap the button again." : "Say who it's for and what you promised. Release when you're done.") : "Try: “Remind me to bring Leo his charger tomorrow, and I owe Mom $40 for groceries.”"}
          </T>
        )}
        {listening && <Bars />}
        {step === "working" && <ActivityIndicator style={{ marginTop: 24 }} color={colors.ink} />}
        {error ? <T w="semibold" style={{ fontSize: 13, color: colors.rust, textAlign: "center", marginTop: 12 }}>{error}</T> : null}

        {step === "done" && found.length > 0 && (
          <>
            <T w="extrabold" style={{ fontSize: 16, marginTop: 18 }}>Sorted into {found.length} promise{found.length === 1 ? "" : "s"}</T>
            <View style={{ gap: 8, marginTop: 10 }}>
              {found.map((p, i) => {
                const type = TYPE[p.kind] ?? "Task";
                return (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, backgroundColor: colors.card }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: TYPE_TONE[type], alignItems: "center", justifyContent: "center" }}>
                      <Icon name={typeIcon[type]} size={17} stroke={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T w="extrabold" style={{ fontSize: 15 }}>{p.title}</T>
                      <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                        {[type, p.due_label === "Tmrw" ? "tomorrow" : p.due_label.toLowerCase(), type === "Money" ? "you owe" : null].filter(Boolean).join(" · ")}
                      </T>
                    </View>
                    <Avatar name={p.person_name} unknown={!p.person_name} size={36} />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {typing && step !== "done" && (
          <View style={{ marginTop: 16, gap: 8 }}>
            <TextInput value={typed} onChangeText={setTyped} multiline placeholder="I'll send Ana the lease by Friday" placeholderTextColor={colors.muted}
              accessibilityLabel="Type your promise"
              style={{ minHeight: 56, borderRadius: 20, backgroundColor: colors.card, padding: 14, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} />
            <PrimaryButton label="Sort it" disabled={!typed.trim()} onPress={() => finish(typed.trim())} />
          </View>
        )}

        <View style={{ flex: 1, minHeight: 20 }} />
        {step === "done" && found.length > 0 ? (
          <>
            <PrimaryButton label={found.length > 1 ? "Save all" : "Save"} onPress={saveAll} disabled={saving} />
            <SoftButton label="Adjust with Peri" style={{ marginTop: 8 }} onPress={async () => { await saveAll(); router.replace("/ask"); }} />
            <TextButton label="Try again" onPress={() => { setFound([]); setQuote(""); setError(""); setStep("ready"); }} />
          </>
        ) : step !== "working" && !typing ? (
          <View style={{ alignItems: "center", gap: 10 }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              {listening && <Ring />}
              <Pressable accessibilityRole="button" accessibilityLabel="Hold to talk"
                onPressIn={pressIn} onPressOut={pressOut} delayLongPress={10000}
                style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: listening ? colors.satellite : colors.ink, alignItems: "center", justifyContent: "center" }}>
                <Icon name="mic" size={30} color={colors.white} stroke={2.4} />
              </Pressable>
            </View>
            <T w="semibold" style={{ fontSize: 13, color: colors.muted }}>{listening ? (tapMode ? "Tap again when you're done" : "Release when you are done") : "Hold (or tap) to tell Peri a promise"}</T>
            <TextButton label="Type it instead" onPress={() => setTyping(true)} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Bars() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, height: 44, marginTop: 14 }}>
      {[14, 26, 38, 20, 32, 16, 28, 22].map((h, i) => (
        <Animated.View key={i} style={{ width: 5, height: h, borderRadius: 3, backgroundColor: colors.satellite,
          transform: [{ scaleY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4 + (i % 3) * 0.15, 1, 0.4 + (i % 3) * 0.15] }) }] }} />
      ))}
    </View>
  );
}

function Ring() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: "rgba(242,106,61,0.5)",
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
    }} />
  );
}
