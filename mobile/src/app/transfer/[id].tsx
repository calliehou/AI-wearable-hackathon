// 09 · Keep a promise: send real money with Venmo.
// Peri opens Venmo with the amount, person and note filled in; you approve the payment there.
// Peri never moves money itself and never sees bank or card details.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, AppState, Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { Avatar, Header, PrimaryButton, SoftButton, T, money } from "../../components/ui";
import { findContact } from "../../data/contacts";
import { useStore } from "../../data/store";
import type { PayMethod } from "../../data/types";
import { colors, fonts } from "../../theme";

const VENMO = { id: "venmo" as PayMethod, label: "Venmo" };

// Venmo finds people by username, phone number or email; Peri saves whichever you use.
type By = "username" | "phone" | "email";
const BY: { id: By; label: string; hint: string; placeholder: string; keyboard: "default" | "phone-pad" | "email-address" }[] = [
  { id: "username", label: "Username", hint: "Venmo username", placeholder: "username", keyboard: "default" },
  { id: "phone", label: "Phone", hint: "phone number on Venmo", placeholder: "(555) 123-4567", keyboard: "phone-pad" },
  { id: "email", label: "Email", hint: "email on Venmo", placeholder: "name@email.com", keyboard: "email-address" },
];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const kindOf = (v: string): By => (EMAIL.test(v) ? "email" : /^\+?[\d\s().-]{7,}$/.test(v) ? "phone" : "username");

// What Venmo gets: "@kelly" → "kelly"; "(555) 123-4567" → "5551234567"; emails as typed, lower case.
function recipient(by: By, v: string) {
  const x = v.trim();
  if (by === "phone") return x.replace(/(?!^\+)[^\d]/g, "");
  if (by === "email") return x.toLowerCase();
  return x.replace(/^[@$]/, "");
}
function valid(by: By, r: string) {
  if (by === "phone") return r.replace(/\D/g, "").length >= 10;
  if (by === "email") return EMAIL.test(r);
  return /^[\w-]{2,}$/.test(r);
}

// The Venmo app if it's installed, otherwise Venmo's website (which offers to open the app).
function venmoLinks(to: string, amount: number, note: string) {
  const amt = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const u = encodeURIComponent(to);
  const n = encodeURIComponent(note);
  return [
    `venmo://paycharge?txn=pay&recipients=${u}&amount=${amt}&note=${n}`,
    `https://venmo.com/?txn=pay&recipients=${u}&amount=${amt}&note=${n}`,
  ];
}

export default function Transfer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const t = s.todo(id);
  const p = s.person(t?.personId ?? null);
  const [split, setSplit] = useState(false);
  const method: PayMethod = "venmo";
  const saved = p?.payee.venmo ?? "";
  // Until you type or pick, show what's saved, including details that arrive while you look.
  const [typed, setUser] = useState<string | null>(null);
  const user = typed ?? saved;
  const heard = p?.payee.venmoSource === "heard" ? p.payee.venmoHeard ?? "" : null;
  const [chosen, setBy] = useState<By | null>(null);
  const by: By = chosen ?? p?.payee.venmoKind ?? (saved ? kindOf(saved) : "username");
  const contact = p ? findContact(s.contacts, p.name) : undefined;
  const [opened, setOpened] = useState(false);
  const [askSent, setAskSent] = useState(false);

  // Back from the payment app: ask whether the payment went through.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => { if (st === "active" && opened) setAskSent(true); });
    return () => sub.remove();
  }, [opened]);

  if (!t) return <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}><Header title="Keep a promise" /></View>;
  const full = t.amount ?? 0;
  const amount = split ? full / 2 : full;
  const m = VENMO;
  const way = BY.find((b) => b.id === by)!;
  const handle = recipient(by, user);
  const ok = valid(by, handle);
  const fromContacts = by === "phone" ? contact?.phone : by === "email" ? contact?.email : undefined;
  const note = t.note ?? t.title;

  async function pay() {
    if (!p || !ok || !amount) return;
    // Paying with it confirms it (also one heard in conversation): saved as yours.
    if (handle !== p.payee[method] || p.payee.method !== method || heard !== null) await s.setPayee(p.name, { [method]: handle, method, venmoKind: by });
    const [app, web] = venmoLinks(handle, amount, note);
    try {
      await Linking.openURL(app);
      setOpened(true);
    } catch {
      try {
        await Linking.openURL(web);
        setOpened(true);
      } catch {
        Alert.alert("Couldn't open Venmo", `Install Venmo, or check the ${by === "username" ? "username" : by === "phone" ? "phone number" : "email"} and try again.`);
      }
    }
  }

  function sent() {
    s.setStatus(t!.id, "done");
    router.replace({ pathname: "/kept/[id]", params: { id: t!.id, amount: String(amount) } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header title="Keep a promise" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 6 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <T w="extrabold" style={{ fontSize: 14, color: colors.white }}>You</T>
          </View>
          <View style={{ width: 50, height: 2, backgroundColor: colors.ring }} />
          <Avatar name={p?.name ?? null} unknown={!p} size={64} color={s.personColor(p)} />
        </View>
        <T w="extrabold" style={{ fontSize: 22, textAlign: "center", marginTop: 10 }}>{p?.name ?? "Choose who first"}</T>

        <T w="extrabold" style={{ fontSize: 52, letterSpacing: -2, textAlign: "center", marginTop: 14 }}>{money(amount)}</T>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8 }}>
          {[{ on: !split, label: `Full ${money(full)}`, set: false }, { on: split, label: `Split · ${money(full / 2)}`, set: true }].map((o) => (
            <Pressable key={o.label} accessibilityRole="radio" accessibilityState={{ checked: o.on }} onPress={() => setSplit(o.set)}
              style={{ height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: "center", backgroundColor: o.on ? colors.ink : colors.card }}>
              <T style={{ fontSize: 13, color: o.on ? colors.white : colors.ink }}>{o.label}</T>
            </Pressable>
          ))}
        </View>
        <T w="semibold" style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 10 }}>You promised this {t.heardLabel.replace("heard ", "")} · “{t.quote}”</T>

        <View style={{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, backgroundColor: "#008CFF", justifyContent: "center" }}>
            <T w="extrabold" style={{ fontSize: 13, color: colors.white }}>venmo</T>
          </View>
          <T w="extrabold" style={{ fontSize: 15 }}>Pay with Venmo</T>
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Find them on Venmo by" style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {BY.map((b) => (
            <Pressable key={b.id} accessibilityRole="radio" accessibilityState={{ checked: by === b.id }} onPress={() => { setBy(b.id); setUser(saved && kindOf(saved) === b.id ? saved : ""); }}
              style={{ flex: 1, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: by === b.id ? colors.ink : colors.card }}>
              <T style={{ fontSize: 13, color: by === b.id ? colors.white : colors.ink }}>{b.label}</T>
            </Pressable>
          ))}
        </View>
        <T w="semibold" style={{ fontSize: 13, color: colors.muted, marginTop: 12 }}>{p ? `${p.name.split(" ")[0]}'s ${way.hint}` : way.hint}</T>
        <View style={{ marginTop: 6, height: 50, borderRadius: 16, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
          {by === "username" && <T style={{ fontSize: 15, color: colors.muted }}>@</T>}
          <TextInput key={by} value={user} onChangeText={setUser} placeholder={way.placeholder} placeholderTextColor={colors.muted}
            autoCapitalize="none" autoCorrect={false} keyboardType={way.keyboard} accessibilityLabel={way.hint}
            textContentType={by === "phone" ? "telephoneNumber" : by === "email" ? "emailAddress" : "none"}
            style={{ flex: 1, height: 48, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} />
          {saved && heard === null && recipient(kindOf(saved), saved) === handle ? <Icon name="tick" size={16} color={colors.green} stroke={3} /> : null}
        </View>
        {heard !== null && saved && recipient(by, saved) === handle ? (
          <View style={{ marginTop: 8, flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#FFF1E8", borderRadius: 14, padding: 10 }}>
            <Icon name="wave" size={16} color={colors.rust} stroke={2.4} />
            <T w="semibold" style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.rust }}>
              Heard in conversation{heard ? `: “${heard}”` : ""}. Check it&apos;s right before you pay.
            </T>
          </View>
        ) : null}
        {fromContacts && recipient(by, fromContacts) !== handle ? (
          <Pressable accessibilityRole="button" onPress={() => setUser(fromContacts)}
            style={{ alignSelf: "flex-start", marginTop: 8, minHeight: 36, borderRadius: 18, paddingHorizontal: 12, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="contacts" size={14} stroke={2.4} />
            <T style={{ fontSize: 13 }}>Use {fromContacts} from contacts</T>
          </Pressable>
        ) : null}
        <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
          {user.trim() && !ok ? `That doesn't look like a ${by === "username" ? "Venmo username" : by === "phone" ? "full phone number" : "valid email"}.`
            : `Saved for next time. Peri only keeps this ${by === "username" ? "username" : by === "phone" ? "number" : "email"}, never bank or card details.`}
        </T>

        <View style={{ flex: 1, minHeight: 20 }} />
        {askSent ? (
          <View style={{ gap: 8 }}>
            <T w="extrabold" style={{ fontSize: 16, textAlign: "center", marginBottom: 4 }}>Did the payment go through in {m.label}?</T>
            <PrimaryButton label={`Yes, I sent ${money(amount)}`} icon="tick" iconLeft onPress={sent} />
            <SoftButton label="Not yet" onPress={() => { setAskSent(false); setOpened(false); }} />
          </View>
        ) : (
          <>
            <PrimaryButton label={`Pay ${money(amount)} in ${m.label}`} icon="arrow" disabled={!p || !ok || !amount} onPress={pay} />
            {opened && <SoftButton label="I sent it" style={{ marginTop: 8 }} onPress={sent} />}
          </>
        )}
        <T w="semibold" style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 10 }}>
          You approve the payment in {m.label}. Nothing moves until you do.
        </T>
      </ScrollView>
    </View>
  );
}
