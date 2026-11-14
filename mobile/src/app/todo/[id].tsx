// Screen 2 · Money promise detected, and screen 6 · Other promise (send a file, call, bring...).
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocArt, RingArt } from "../../components/Art";
import { Icon } from "../../components/Icon";
import { Avatar, Chip, Header, PrimaryButton, QuoteBubble, SoftButton, T, TextButton, money } from "../../components/ui";
import { WhoPicker } from "../../components/WhoPicker";
import { useStore } from "../../data/store";
import { colors } from "../../theme";

export default function TodoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todo, person, setStatus } = useStore();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const t = todo(id);
  if (!t) return <View style={{ flex: 1, backgroundColor: colors.white }}><Header title="Not found" /></View>;
  const p = person(t.personId);
  const isMoney = t.kind === "money";
  const bg = isMoney ? colors.orange : colors.sky;

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <Header title="Promise detected" light={isMoney} />
      <View style={{ height: 300, alignItems: "center" }}>
        {isMoney ? <RingArt size={232} darker /> : <DocArt size={232} />}
        <View style={{ position: "absolute", top: 10, right: 20, backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12 }}>
          <T style={{ fontSize: 12, color: colors.white }}>{Math.round(t.confidence * 100)}% sure</T>
        </View>
        <View style={{ position: "absolute", bottom: 14, left: 20, right: 20 }}><QuoteBubble text={t.quote} /></View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 12 }}>
        <View style={{ width: 56, height: 5, borderRadius: 3, backgroundColor: colors.sheetHandle, alignSelf: "center", marginBottom: 20 }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {p ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.name}'s contact card`} onPress={() => router.push({ pathname: "/person/[id]", params: { id: p.id } })}>
                <Avatar name={p.name} size={48} />
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Choose who this promise is with" onPress={() => setPicking(true)}>
                <Avatar name={null} unknown size={48} />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              {p ? (
                <T w="extrabold" style={{ fontSize: 16 }}>{p.name}</T>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => setPicking(true)} hitSlop={6}>
                  <T w="extrabold" style={{ fontSize: 16, textDecorationLine: "underline" }}>Who is this? Tap to choose</T>
                </Pressable>
              )}
              <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Heard by your Vexo band · {t.heardAt}</T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Read transcript"
              onPress={() => Alert.alert("What the band heard", `“${t.quote}”`)}
              style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
              <Icon name="lines" size={22} color={colors.white} />
            </Pressable>
          </View>

          <View style={{ marginTop: 22, minHeight: 84, borderWidth: 2, borderColor: colors.line, borderRadius: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 16 }}>
            <T w="extrabold" style={{ fontSize: isMoney ? 44 : 26, letterSpacing: isMoney ? -1.5 : -0.6, textAlign: "center", flexShrink: 1 }}>
              {isMoney && t.amount != null ? money(t.amount) : t.title}
            </T>
            {isMoney && (
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                <Icon name="chevronDown" size={16} stroke={2.4} />
              </View>
            )}
          </View>
          <T style={{ fontSize: 14, textAlign: "center", marginTop: 12 }}>
            Due {t.dueLabel.toLowerCase() === "tonight" ? "tonight" : t.dueLabel}{t.dueDetail ? ` · ${t.dueDetail}` : ""}
          </T>

          {isMoney ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 18 }}>
              {t.note ? <Chip label={`For ${t.note.split(" ")[0].toLowerCase()}`} /> : null}
              <Chip label={p ? "In your contacts" : "Person not chosen"} />
              <Chip label="One time" />
            </View>
          ) : t.attachment ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, marginTop: 18 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
                <Icon name="file" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>Suggested attachment</T>
                <T w="extrabold" style={{ fontSize: 14, marginTop: 1 }}>{t.attachment}</T>
              </View>
            </View>
          ) : null}

          <View style={{ flex: 1, minHeight: 24 }} />

          {isMoney ? (
            <>
              <PrimaryButton label="Ask my bank to confirm" icon="arrow"
                onPress={() => (p ? router.push({ pathname: "/nudge/[id]", params: { id: t.id } }) : setPicking(true))} />
              <TextButton label="That wasn't a promise" onPress={() => { setStatus(t.id, "dismissed"); router.replace("/"); }} />
            </>
          ) : (
            <>
              <PrimaryButton label={p ? `Draft the message to ${p.name.split(" ")[0]}` : "Choose who it's for"} icon="arrow"
                onPress={() => (p ? Alert.alert("Drafted", `A message to ${p.name} is ready in your messages app.`) : setPicking(true))} />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <SoftButton label={`Remind me ${t.dueLabel === "Mon" ? "Monday" : t.dueLabel.toLowerCase()}`} onPress={() => router.back()} />
                <SoftButton label="Already done" onPress={() => { setStatus(t.id, "done"); router.replace("/"); }} />
              </View>
            </>
          )}
        </ScrollView>
      </View>
      <WhoPicker todoId={t.id} visible={picking} onClose={() => setPicking(false)} />
    </View>
  );
}
