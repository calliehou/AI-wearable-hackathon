// Screen 9 · Voice: add a promise. Listening → "Here's what I got" → Added.
// The phone records; the Mac (web app) transcribes with Deepgram and Claude reads who/what/when.
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RingArt } from "../components/Art";
import { Icon } from "../components/Icon";
import { Avatar, PrimaryButton, SoftButton, T } from "../components/ui";
import { parsePromise, type Parsed } from "../data/api";
import { useStore } from "../data/store";
import { colors, fonts } from "../theme";

type Step = "listen" | "working" | "parsed" | "added";
const BARS = [12, 22, 32, 16, 26, 38, 14, 28, 34, 18, 30, 14, 36, 20, 12, 26];
const TITLES: Record<Step, string> = { listen: "Add a promise", working: "Got it", parsed: "Got it", added: "Added" };

export default function Record() {
  const insets = useSafeAreaInsets();
  const { people, addTodo } = useStore();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [step, setStep] = useState<Step>("listen");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);

  async function start() {
    setError("");
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Peri needs the microphone to hear your promise. You can type it instead.");
        setTyping(true);
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch {
      setError("Couldn't start the microphone. You can type the promise instead.");
      setTyping(true);
    }
  }

  // Start listening as soon as the screen opens, like the design.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the design starts listening on open
    start();
    return () => { recorder.stop().catch(() => undefined); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(text?: string) {
    setStep("working");
    setError("");
    try {
      let uri: string | undefined;
      if (!text) {
        await recorder.stop();
        setRecording(false);
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        uri = recorder.uri ?? undefined;
      }
      const result = await parsePromise({ uri, text }, people.map((p) => p.name));
      if (!result.is_promise) {
        setError(`“${result.quote}” doesn't sound like a promise. Try again with who it's for and what you'll do.`);
        setStep("listen");
        return;
      }
      setParsed(result);
      setStep("parsed");
    } catch (e) {
      setError((e as Error).message);
      setTyping(true);
      setStep("listen");
    }
  }

  function again() {
    setParsed(null); setTyped(""); setTyping(false); setStep("listen"); start();
  }

  function add() {
    if (!parsed) return;
    addTodo({
      title: parsed.title, quote: parsed.quote, kind: parsed.kind, amount: parsed.amount,
      dueLabel: parsed.due_label, dueDetail: parsed.due_detail,
    }, parsed.person_name).then(() => setStep("added")).catch((e) => setError((e as Error).message));
  }

  const who = parsed?.person_name ?? null;
  const due = parsed ? [parsed.due_label === "Fri" ? "Friday" : parsed.due_label, parsed.due_detail].filter(Boolean).join(" · ") : "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.orange, paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={18} color={colors.white} stroke={2.6} />
        </Pressable>
        <T style={{ flex: 1, textAlign: "center", fontSize: 15, color: colors.white, marginRight: 44 }}>{TITLES[step]}</T>
      </View>

      <View style={{ height: 240, alignItems: "center", justifyContent: "center" }}>
        {step === "listen" && recording && <Pulse />}
        <RingArt size={200} darker />
      </View>

      <View style={{ flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 16 }}>
        <View style={{ width: 56, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: "center", marginBottom: 18 }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {step === "listen" && (
            <View style={{ flex: 1, alignItems: "center" }}>
              {recording ? <Bars /> : <View style={{ height: 40 }} />}
              <T w="extrabold" style={{ fontSize: 28, letterSpacing: -0.6, marginTop: 14 }}>{recording ? "Listening…" : "Ready when you are"}</T>
              <T w="medium" style={{ fontSize: 15, color: colors.soft, lineHeight: 22, marginTop: 8, textAlign: "center", maxWidth: 300 }}>
                Say who it's for and what you promised. Add a day if there is one.
              </T>
              {error ? <T w="semibold" style={{ fontSize: 13, color: colors.rust, textAlign: "center", marginTop: 10 }}>{error}</T> : null}
              {!typing && (
                <View style={{ gap: 8, marginTop: 16, alignItems: "center" }}>
                  {["Remind me to send Ana the lease by Friday", "I owe Leo $20 for lunch"].map((ex) => (
                    <View key={ex} style={{ backgroundColor: colors.card, borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14 }}>
                      <T style={{ fontSize: 13 }}>“{ex}”</T>
                    </View>
                  ))}
                </View>
              )}
              {typing && (
                <View style={{ alignSelf: "stretch", marginTop: 16, gap: 8 }}>
                  <TextInput value={typed} onChangeText={setTyped} placeholder="I'll send Ana the lease by Friday" placeholderTextColor={colors.muted}
                    accessibilityLabel="Type your promise" multiline
                    style={{ minHeight: 56, borderRadius: 20, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} />
                  <PrimaryButton label="Read it" onPress={() => typed.trim() && finish(typed.trim())} />
                </View>
              )}
              <View style={{ flex: 1, minHeight: 20 }} />
              {!typing && (
                <>
                  <Pressable accessibilityRole="button" accessibilityLabel={recording ? "Stop and add promise" : "Start listening"}
                    onPress={() => (recording ? finish() : start())}
                    style={({ pressed }) => ({ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}>
                    {recording ? <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.white }} /> : <Icon name="mic" size={28} color={colors.white} stroke={2.4} />}
                  </Pressable>
                  <T w="semibold" style={{ fontSize: 13, color: colors.muted, marginTop: 10 }}>{recording ? "Tap when you're done" : "Tap to start"}</T>
                </>
              )}
              <Pressable accessibilityRole="button" onPress={() => { if (recording) { recorder.stop(); setRecording(false); } setTyping(!typing); }} style={{ height: 44, justifyContent: "center" }}>
                <T style={{ fontSize: 13, color: colors.soft }}>{typing ? "Use my voice instead" : "Type it instead"}</T>
              </Pressable>
            </View>
          )}

          {step === "working" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
              <ActivityIndicator size="large" color={colors.ink} />
              <T w="semibold" style={{ fontSize: 15, color: colors.soft }}>Reading your promise…</T>
            </View>
          )}

          {step === "parsed" && parsed && (
            <View style={{ flex: 1 }}>
              <T w="extrabold" style={{ fontSize: 22, letterSpacing: -0.4 }}>Here's what I got</T>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, marginTop: 14 }}>
                <View style={{ marginTop: 2 }}><Icon name="wave" size={18} stroke={2.4} /></View>
                <T w="semibold" style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>“{parsed.quote}”</T>
              </View>
              <View style={{ borderWidth: 2, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 16, marginTop: 14 }}>
                <Field k="To">
                  {who ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Avatar name={who} size={28} /><T w="extrabold" style={{ fontSize: 14 }}>{who}</T>
                    </View>
                  ) : (
                    <T w="extrabold" style={{ fontSize: 14, color: colors.rust }}>Choose after adding</T>
                  )}
                </Field>
                <Field k="Promise"><T w="extrabold" style={{ fontSize: 14 }}>{parsed.kind === "money" && parsed.amount ? `${parsed.title} · $${parsed.amount}` : parsed.title}</T></Field>
                <Field k="Due" last><T w="extrabold" style={{ fontSize: 14 }}>{due}</T></Field>
              </View>
              <View style={{ flex: 1, minHeight: 24 }} />
              <PrimaryButton label="Add promise" icon="plus" iconLeft onPress={add} />
              <SoftButton label="Try again" onPress={again} style={{ flex: 0, marginTop: 8 }} />
            </View>
          )}

          {step === "added" && parsed && (
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.orangeDot, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
                <Icon name="tick" size={36} stroke={2.8} />
              </View>
              <T w="extrabold" style={{ fontSize: 28, letterSpacing: -0.6, marginTop: 18, textAlign: "center" }}>{who ? `Added for ${who}` : "Promise added"}</T>
              <T w="medium" style={{ fontSize: 15, color: colors.soft, marginTop: 8, textAlign: "center" }}>
                {parsed.title} · due {due}
              </T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, marginTop: 22, alignSelf: "stretch" }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="wave" size={16} color={colors.white} stroke={2.6} />
                </View>
                <T w="semibold" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
                  {who ? `You'll get a nudge ${parsed.due_label === "Fri" ? "Friday morning" : "before it's due"}, and your band will buzz once.` : "Tap “Who is this?” on the promise to pick them from your contacts."}
                </T>
              </View>
              <View style={{ flex: 1, minHeight: 24 }} />
              <PrimaryButton label="Back to Promises" onPress={() => router.replace("/")} style={{ alignSelf: "stretch" }} />
              <SoftButton label="Add another" onPress={again} style={{ flex: 0, alignSelf: "stretch", marginTop: 8 }} />
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function Field({ k, children, last }: { k: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 50, borderBottomWidth: last ? 0 : 2, borderBottomColor: colors.line }}>
      <T w="semibold" style={{ fontSize: 14, color: colors.muted }}>{k}</T>
      {children}
    </View>
  );
}

function Bars() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 40 }}>
      {BARS.map((h, i) => {
        const ph = (i * 0.37) % 1;
        const scaleY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4 + ph * 0.3, 1 - ph * 0.3, 0.4 + ph * 0.3] });
        return <Animated.View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: colors.ink, transform: [{ scaleY }] }} />;
      })}
    </View>
  );
}

function Pulse() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: "rgba(255,255,255,0.55)",
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.6] }) }],
    }} />
  );
}
