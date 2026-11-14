// 05 · Circles: see who's in each circle, add or remove people, and create new circles.
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { Avatar, Header, PrimaryButton, T, TextButton } from "../components/ui";
import { useStore } from "../data/store";
import { colors, fonts, SWATCHES } from "../theme";

export default function Circles() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(SWATCHES[4]);
  const circle = s.circles[Math.min(sel, s.circles.length - 1)];
  const members = circle ? s.people.filter((p) => p.circles.includes(circle.name)) : [];
  const loose = s.people.filter((p) => !p.circles.length);
  const others = circle ? s.people.filter((p) => p.circles.length && !p.circles.includes(circle.name)) : [];

  async function create() {
    const name = draft.trim();
    if (!name) return;
    await s.createCircle(name, color);
    setAdding(false); setDraft("");
    setSel(s.circles.length); // the new one is added at the end
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header label="Back" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <T w="extrabold" style={{ fontSize: 34, letterSpacing: -1 }}>Circles</T>
        <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>Tap a circle to see who&apos;s in it</T>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {s.circles.map((c, i) => {
            const on = i === sel && !adding;
            const faces = s.people.filter((p) => p.circles.includes(c.name));
            return (
              <Pressable key={c.name} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setSel(i); setAdding(false); }}
                style={{ width: "48%", height: 96, borderRadius: 22, padding: 12, justifyContent: "space-between", backgroundColor: c.color, borderWidth: 2.5, borderColor: on ? colors.ink : "transparent" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T w="extrabold" style={{ fontSize: 16 }}>{c.name}</T>
                  <T w="extrabold" style={{ fontSize: 14 }}>{faces.length}</T>
                </View>
                <View style={{ flexDirection: "row" }}>
                  {faces.slice(0, 4).map((f, j) => (
                    <View key={f.id} style={{ marginLeft: j ? -9 : 0 }}><Avatar name={f.name} size={30} color="#FFFFFF" border /></View>
                  ))}
                </View>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => setAdding(true)}
            style={{ width: "48%", height: 96, borderRadius: 22, borderWidth: 2, borderStyle: "dashed", borderColor: colors.dashed, alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="plus" size={20} stroke={2.4} />
            <T style={{ fontSize: 14 }}>New circle</T>
          </Pressable>
        </View>

        {adding ? (
          <View style={{ marginTop: 18, padding: 16, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line }}>
            <T w="semibold" style={{ fontSize: 13, color: colors.muted }}>Name your circle</T>
            <TextInput value={draft} onChangeText={setDraft} placeholder="e.g. Climbing crew" placeholderTextColor={colors.muted} autoFocus
              accessibilityLabel="Name your circle"
              style={{ height: 48, borderRadius: 16, backgroundColor: colors.card, paddingHorizontal: 14, marginTop: 8, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }} />
            <T w="semibold" style={{ fontSize: 13, color: colors.muted, marginTop: 14 }}>Color</T>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              {SWATCHES.map((c) => (
                <Pressable key={c} accessibilityRole="radio" accessibilityLabel={`Color ${c}`} accessibilityState={{ checked: color === c }} onPress={() => setColor(c)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: 3, borderColor: color === c ? colors.ink : colors.white }} />
              ))}
            </View>
            <PrimaryButton label="Create circle" onPress={create} disabled={!draft.trim()} style={{ marginTop: 16 }} />
            <TextButton label="Cancel" onPress={() => setAdding(false)} />
          </View>
        ) : circle ? (
          <View style={{ marginTop: 22 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T w="extrabold" style={{ fontSize: 18 }}>{circle.name}</T>
              <T style={{ fontSize: 13, color: colors.muted }}>{members.length} {members.length === 1 ? "person" : "people"}</T>
            </View>
            {members.map((m) => (
              <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 58, borderBottomWidth: 1.5, borderBottomColor: colors.card }}>
                <Avatar name={m.name} size={38} color={circle.color} />
                <T w="extrabold" style={{ flex: 1, fontSize: 15 }}>{m.name}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.name} from ${circle.name}`} onPress={() => s.setMembership(m.name, circle.name, false)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="close" size={14} stroke={2.6} />
                </Pressable>
              </View>
            ))}
            {!members.length && <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 10 }}>Nobody in {circle.name} yet. Add people below.</T>}

            {(loose.length > 0 || others.length > 0) && (
              <>
                <T style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.6, marginTop: 20 }}>{loose.length ? "NOT IN A CIRCLE YET · ADD THEM" : "ADD FROM OTHER CIRCLES"}</T>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {(loose.length ? loose : others).map((l) => (
                    <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`Add ${l.name} to ${circle.name}`} onPress={() => s.setMembership(l.name, circle.name, true)}
                      style={{ height: 40, borderRadius: 20, paddingLeft: 4, paddingRight: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card }}>
                      <Avatar name={l.name} size={32} />
                      <T style={{ fontSize: 13 }}>+ {l.name}</T>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
