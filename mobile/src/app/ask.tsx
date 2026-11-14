// 04 · Ask Peri: suggestions (who's drifting, what's due), today's promises to check, and a
// chat that can answer questions and fix promises ("Make Leo's due Thursday").
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, NAV_SPACE } from "../components/BottomNav";
import { Icon, typeIcon } from "../components/Icon";
import { Avatar, T } from "../components/ui";
import { askPeri } from "../data/api";
import { useStore } from "../data/store";
import { colors, fonts, TYPE_TONE } from "../theme";

type Msg = { role: "user" | "peri"; text: string };
const REC_TONE: Record<string, string> = { drift: "#CDEBFB", due: "#FBDDD9" };

export default function Ask() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const { about } = useLocalSearchParams<{ about?: string }>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState(about ? `What could I do with ${about} this weekend?` : "");
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const todayIso = new Date().toDateString();
  const todays = s.todos.filter((t) => t.status === "open" && new Date(t.heardIso).toDateString() === todayIso).slice(0, 5);
  const recs = s.recs.filter((r) => !hidden.has(r.title));

  useEffect(() => { scroll.current?.scrollToEnd({ animated: true }); }, [msgs.length, busy]);

  async function send(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || busy) return;
    setDraft("");
    const history = msgs;
    setMsgs([...history, { role: "user", text: message }]);
    setBusy(true);
    try {
      const a = await askPeri(message, history);
      setMsgs((m) => [...m, { role: "peri", text: a.reply }]);
      if (a.applied.length) s.refresh();
    } catch (e) {
      setMsgs((m) => [...m, { role: "peri", text: `Sorry, I couldn't answer that. ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: NAV_SPACE + 70 }} keyboardShouldPersistTaps="handled">
        <T w="extrabold" style={{ fontSize: 34, letterSpacing: -1, paddingHorizontal: 20 }}>Ask Peri</T>

        {recs.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={312} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 14 }}>
            {recs.map((r) => {
              const p = s.person(r.personId);
              return (
                <View key={r.title} style={{ width: 300, borderRadius: 24, padding: 16, backgroundColor: REC_TONE[r.kind] ?? "#E2F2E7" }}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <Avatar name={p?.name ?? null} unknown={!p} size={44} color={s.personColor(p)} border faded={r.kind === "drift"} />
                    <View style={{ flex: 1 }}>
                      <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={2}>{r.title}</T>
                      <T w="medium" style={{ fontSize: 12, color: colors.soft, marginTop: 2 }} numberOfLines={1}>{r.sub}</T>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                    <Pressable accessibilityRole="button" onPress={() => r.kind === "drift" ? send(`${p?.name ?? "They"} has been quiet. Any idea how to reconnect?`) : router.push(r.target as never)}
                      style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                      <T style={{ fontSize: 13, color: colors.white }}>{r.cta}</T>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => setHidden(new Set([...hidden, r.title]))}
                      style={{ height: 40, borderRadius: 20, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center" }}>
                      <T style={{ fontSize: 13 }}>Not now</T>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 22, gap: 10 }}>
          {todays.length > 0 && (
            <View style={{ alignSelf: "flex-start", maxWidth: "88%", backgroundColor: colors.card, borderRadius: 22, borderTopLeftRadius: 6, padding: 14 }}>
              <T style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.6 }}>TODAY · FROM YOUR BAND</T>
              <T w="extrabold" style={{ fontSize: 15, marginTop: 4 }}>I saved {todays.length} promise{todays.length === 1 ? "" : "s"}. Anything to fix?</T>
              <View style={{ gap: 6, marginTop: 10 }}>
                {todays.map((t) => (
                  <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/promise/[id]", params: { id: t.id } })}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderRadius: 16, padding: 10 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: TYPE_TONE[t.type], alignItems: "center", justifyContent: "center" }}>
                      <Icon name={typeIcon[t.type]} size={15} stroke={2.4} />
                    </View>
                    <T w="extrabold" style={{ flex: 1, fontSize: 13 }} numberOfLines={1}>{t.title}</T>
                    <T style={{ fontSize: 12, color: colors.muted }}>{t.dueLabel}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {!todays.length && !msgs.length && (
            <View style={{ alignSelf: "flex-start", maxWidth: "88%", backgroundColor: colors.card, borderRadius: 22, borderTopLeftRadius: 6, padding: 14 }}>
              <T w="semibold" style={{ fontSize: 14, lineHeight: 20 }}>Hi! Ask me about your people and promises, or tell me what to change. Try “What do I owe this week?”</T>
            </View>
          )}
          {msgs.map((m, i) => (
            <View key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", borderRadius: 22, padding: 14,
              backgroundColor: m.role === "user" ? colors.ink : colors.card,
              ...(m.role === "user" ? { borderTopRightRadius: 6 } : { borderTopLeftRadius: 6 }),
            }}>
              <T w="semibold" style={{ fontSize: 14, lineHeight: 20, color: m.role === "user" ? colors.white : colors.ink }}>{m.text}</T>
            </View>
          ))}
          {busy && <ActivityIndicator style={{ alignSelf: "flex-start", marginLeft: 12 }} color={colors.ink} />}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + 86, flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ flex: 1, height: 50, borderRadius: 25, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, justifyContent: "center",
          shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Ask Peri or fix a promise…" placeholderTextColor={colors.muted}
            accessibilityLabel="Message Peri" returnKeyType="send" onSubmitEditing={() => send()}
            style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, height: 46 }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={draft.trim() ? "Send" : "Talk to Peri"} onPress={() => (draft.trim() ? send() : router.push("/mic"))}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
          <Icon name={draft.trim() ? "arrow" : "mic"} size={20} color={colors.white} stroke={2.4} />
        </Pressable>
      </View>
      <BottomNav />
    </KeyboardAvoidingView>
  );
}
