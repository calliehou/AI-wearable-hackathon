// Put one person in circles: tap a circle to add them right away, tap again to remove.
// A new circle can be created here too, and the person is added to it.
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import type { Person } from "../data/types";
import { colors, fonts, SWATCHES } from "../theme";
import { Icon } from "./Icon";
import { PrimaryButton, T } from "./ui";

export function CirclePicker({ person, visible, onClose }: { person: Person; visible: boolean; onClose: () => void }) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(SWATCHES[4]);
  const first = person.name.split(" ")[0];

  async function createAndAdd() {
    const name = draft.trim();
    if (!name) return;
    await s.createCircle(name, color);
    await s.setMembership(person.name, name, true);
    setDraft(""); setAdding(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16, maxHeight: "80%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T w="extrabold" style={{ fontSize: 20 }}>{first}&apos;s circles</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={onClose}
              style={{ height: 40, borderRadius: 20, paddingHorizontal: 16, backgroundColor: colors.ink, justifyContent: "center" }}>
              <T style={{ fontSize: 14, color: colors.white }}>Done</T>
            </Pressable>
          </View>
          <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Tap to add or remove. Changes save right away.</T>

          <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              {s.circles.map((c) => {
                const on = person.circles.includes(c.name);
                return (
                  <Pressable key={c.name} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c.name}
                    onPress={() => s.setMembership(person.name, c.name, !on)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, borderRadius: 18, paddingHorizontal: 14,
                      backgroundColor: c.color, borderWidth: 2.5, borderColor: on ? colors.ink : "transparent" }}>
                    <T w="extrabold" style={{ flex: 1, fontSize: 16 }}>{c.name}</T>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: on ? colors.ink : colors.white, alignItems: "center", justifyContent: "center" }}>
                      {on ? <Icon name="tick" size={15} color={colors.white} stroke={3} /> : <Icon name="plus" size={15} stroke={2.6} />}
                    </View>
                  </Pressable>
                );
              })}

              {adding ? (
                <View style={{ padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, gap: 10 }}>
                  <TextInput value={draft} onChangeText={setDraft} autoFocus placeholder="e.g. Climbing crew" placeholderTextColor={colors.muted}
                    accessibilityLabel="New circle name" returnKeyType="done" onSubmitEditing={createAndAdd}
                    style={{ height: 48, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }} />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {SWATCHES.map((c) => (
                      <Pressable key={c} accessibilityRole="radio" accessibilityLabel={`Color ${c}`} accessibilityState={{ checked: color === c }} onPress={() => setColor(c)}
                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: 3, borderColor: color === c ? colors.ink : colors.white }} />
                    ))}
                  </View>
                  <PrimaryButton label={`Create and add ${first}`} onPress={createAndAdd} disabled={!draft.trim()} />
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => setAdding(true)}
                  style={{ height: 56, borderRadius: 18, borderWidth: 2, borderStyle: "dashed", borderColor: colors.dashed, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Icon name="plus" size={16} stroke={2.6} />
                  <T style={{ fontSize: 15 }}>New circle</T>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
