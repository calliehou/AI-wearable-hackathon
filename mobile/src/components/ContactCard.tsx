// A person's phone, email and website: from your phone's contacts, heard in conversation
// ("my number is…", marked so you can check it) or typed here. Tap to call, email or open.
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DetailKind, Person } from "../data/types";
import { colors, fonts } from "../theme";
import { Icon, type IconName } from "./Icon";
import { PrimaryButton, T, TextButton } from "./ui";

const ROWS: { kind: DetailKind; label: string; icon: IconName; keyboard: "phone-pad" | "email-address" | "url" }[] = [
  { kind: "phone", label: "Phone", icon: "phone", keyboard: "phone-pad" },
  { kind: "email", label: "Email", icon: "send", keyboard: "email-address" },
  { kind: "website", label: "Website", icon: "search", keyboard: "url" },
];

// What to show for each kind: your phone's contact first, then what Peri saved.
function valueOf(p: Person, kind: DetailKind) {
  if (kind === "phone" && p.phone) return { value: p.phone, from: "contacts" as const };
  if (kind === "email" && p.email) return { value: p.email, from: "contacts" as const };
  const d = p.details?.[kind];
  return d ? { value: d.value, from: d.source, quote: d.quote } : null;
}
function open(kind: DetailKind, v: string) {
  const url = kind === "phone" ? `tel:${v.replace(/[^\d+]/g, "")}` : kind === "email" ? `mailto:${v}` : /^https?:\/\//i.test(v) ? v : `https://${v}`;
  Linking.openURL(url).catch(() => undefined);
}

export function ContactCard({ person, onSave }: {
  person: Person; onSave: (change: Partial<Record<DetailKind, string | null>>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const first = person.name.split(" ")[0];
  const shown = ROWS.map((r) => ({ ...r, v: valueOf(person, r.kind) })).filter((r) => r.v);
  return (
    <View style={{ marginTop: 14, borderRadius: 22, backgroundColor: colors.card, padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <T w="extrabold" style={{ flex: 1, fontSize: 15 }}>Contact</T>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${first}'s contact details`} onPress={() => setEditing(true)} hitSlop={8}
          style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="edit" size={14} stroke={2.4} />
          <T style={{ fontSize: 13 }}>{shown.length ? "Edit" : "Add"}</T>
        </Pressable>
      </View>
      {!shown.length && (
        <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
          No phone, email or website yet. If {first} says theirs out loud, Peri saves it here.
        </T>
      )}
      {shown.map((r) => (
        <Pressable key={r.kind} accessibilityRole="button" accessibilityLabel={`${r.label}: ${r.v!.value}. Opens ${r.kind === "phone" ? "the phone" : r.kind === "email" ? "email" : "the website"}`}
          onPress={() => open(r.kind, r.v!.value)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, marginTop: 8, borderRadius: 16, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Icon name={r.icon} size={15} stroke={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="medium" style={{ fontSize: 11, color: colors.muted }}>{r.label}{r.v!.from === "contacts" ? " · from your contacts" : ""}</T>
            <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{r.v!.value}</T>
            {r.v!.from === "heard" && (
              <T w="semibold" style={{ fontSize: 11, color: colors.rust, marginTop: 2 }} numberOfLines={2}>
                Heard in conversation{r.v!.quote ? `: “${r.v!.quote}”` : ""}. Check it&apos;s right.
              </T>
            )}
          </View>
          <Icon name="chevronRight" size={16} color={colors.grey} stroke={2.4} />
        </Pressable>
      ))}
      <DetailsSheet key={String(editing)} visible={editing} person={person} onClose={() => setEditing(false)} onSave={onSave} />
    </View>
  );
}

function DetailsSheet({ visible, person, onClose, onSave }: {
  visible: boolean; person: Person; onClose: () => void; onSave: (change: Partial<Record<DetailKind, string | null>>) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const start = (k: DetailKind) => person.details?.[k]?.value ?? "";
  const [draft, setDraft] = useState<Record<DetailKind, string>>({ phone: start("phone"), email: start("email"), website: start("website") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const change: Partial<Record<DetailKind, string | null>> = {};
    for (const r of ROWS) {
      const now = draft[r.kind].trim();
      // Saving a heard value as-is confirms it (it becomes yours).
      if (now !== start(r.kind) || (now && person.details?.[r.kind]?.source === "heard")) change[r.kind] = now || null;
    }
    if (!Object.keys(change).length) { onClose(); return; }
    setBusy(true); setError("");
    try { await onSave(change); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16 }}>
          <T w="extrabold" style={{ fontSize: 20 }}>{person.name.split(" ")[0]}&apos;s contact</T>
          <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Saved in Peri on your Mac. Leave a field empty to remove it.</T>
          {ROWS.map((r) => (
            <View key={r.kind} style={{ marginTop: 12 }}>
              <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>{r.label}</T>
              <TextInput value={draft[r.kind]} onChangeText={(v) => setDraft({ ...draft, [r.kind]: v })} accessibilityLabel={r.label}
                keyboardType={r.keyboard} autoCapitalize="none" autoCorrect={false} placeholderTextColor={colors.muted}
                placeholder={r.kind === "phone" ? "(555) 123-4567" : r.kind === "email" ? "name@email.com" : "example.com"}
                style={{ marginTop: 4, height: 50, borderRadius: 16, backgroundColor: colors.card, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }} />
            </View>
          ))}
          {error ? <T w="semibold" style={{ fontSize: 13, color: colors.rust, marginTop: 8 }}>{error}</T> : null}
          <PrimaryButton label="Save" onPress={save} disabled={busy} style={{ marginTop: 16 }} />
          <TextButton label="Cancel" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
