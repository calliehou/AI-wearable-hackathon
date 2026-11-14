// Edit a person's name. The new name is used everywhere: promises, conversations, circles,
// Venmo username and the band's voice memory.
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";
import { PrimaryButton, T, TextButton } from "./ui";

export function RenameSheet({ visible, name, onClose, onSave }: {
  visible: boolean; name: string; onClose: () => void; onSave: (newName: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clean = draft.trim();

  async function save() {
    if (!clean || clean === name) { onClose(); return; }
    setBusy(true); setError("");
    try {
      await onSave(clean);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16 }}>
          <T w="extrabold" style={{ fontSize: 20 }}>Edit name</T>
          <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            Updates their promises, conversations, circles and the band&apos;s voice memory.
          </T>
          <TextInput value={draft} onChangeText={setDraft} autoFocus selectTextOnFocus accessibilityLabel="Name"
            returnKeyType="done" onSubmitEditing={save} placeholder="Name" placeholderTextColor={colors.muted}
            style={{ marginTop: 14, height: 52, borderRadius: 16, backgroundColor: colors.card, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }} />
          {error ? <T w="semibold" style={{ fontSize: 13, color: colors.rust, marginTop: 8 }}>{error}</T> : null}
          <PrimaryButton label="Save" onPress={save} disabled={!clean || busy} style={{ marginTop: 14 }} />
          <TextButton label="Cancel" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
