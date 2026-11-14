// 09 · Keep a promise: send real money with Venmo, Cash App or PayPal.
// Peri opens the payment app with the amount, person and note filled in; you approve the
// payment there. Peri never moves money itself and never sees bank or card details.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, AppState, Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { Avatar, Header, PrimaryButton, SoftButton, T, money } from "../../components/ui";
import { useStore } from "../../data/store";
import type { PayMethod } from "../../data/types";
import { colors, fonts } from "../../theme";

const METHODS: { id: PayMethod; label: string; prefix: string; hint: string; bg: string }[] = [
  { id: "venmo", label: "Venmo", prefix: "@", hint: "Venmo username", bg: "#E3F0FB" },
  { id: "cashapp", label: "Cash App", prefix: "$", hint: "$Cashtag", bg: "#E2F2E7" },
  { id: "paypal", label: "PayPal", prefix: "paypal.me/", hint: "PayPal.Me name", bg: "#FFF0B8" },
];

function payLink(method: PayMethod, user: string, amount: number, note: string) {
  const amt = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const u = encodeURIComponent(user);
  if (method === "venmo") return `https://venmo.com/${u}?txn=pay&amount=${amt}&note=${encodeURIComponent(note)}`;
  if (method === "cashapp") return `https://cash.app/$${u}/${amt}`;
  return `https://paypal.me/${u}/${amt}USD`;
}

export default function Transfer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const insets = useSafeAreaInsets();
  const t = s.todo(id);
  const p = s.person(t?.personId ?? null);
  const [split, setSplit] = useState(false);
  const [method, setMethod] = useState<PayMethod>(p?.payee.method ?? (p?.payee.venmo ? "venmo" : p?.payee.cashapp ? "cashapp" : p?.payee.paypal ? "paypal" : "venmo"));
  const saved = p?.payee[method] ?? "";
  const [user, setUser] = useState(saved);
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
  const m = METHODS.find((x) => x.id === method)!;
  const handle = (user || saved).trim().replace(/^[@$]/, "");
  const note = t.note ?? t.title;

  function pickMethod(next: PayMethod) {
    setMethod(next);
    setUser(p?.payee[next] ?? "");
  }

  async function pay() {
    if (!p || !handle || !amount) return;
    if (handle !== p.payee[method] || p.payee.method !== method) await s.setPayee(p.name, { [method]: handle, method });
    const url = payLink(method, handle, amount, note);
    try {
      await Linking.openURL(url);
      setOpened(true);
    } catch {
      Alert.alert(`Couldn't open ${m.label}`, `Check that ${m.label} is installed, or try another app.`);
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

        <T w="extrabold" style={{ fontSize: 15, marginTop: 22 }}>Pay with</T>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {METHODS.map((x) => (
            <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{ checked: x.id === method }} onPress={() => pickMethod(x.id)}
              style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: x.bg, borderWidth: 2, borderColor: x.id === method ? colors.ink : "transparent", alignItems: "center", justifyContent: "center" }}>
              <T w="extrabold" style={{ fontSize: 13 }}>{x.label}</T>
            </Pressable>
          ))}
        </View>

        <T w="semibold" style={{ fontSize: 13, color: colors.muted, marginTop: 14 }}>{p ? `${p.name.split(" ")[0]}'s ${m.hint}` : m.hint}</T>
        <View style={{ marginTop: 6, height: 50, borderRadius: 16, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}>
          <T style={{ fontSize: 15, color: colors.muted }}>{m.prefix}</T>
          <TextInput value={user} onChangeText={setUser} placeholder={method === "paypal" ? "name" : "username"} placeholderTextColor={colors.muted}
            autoCapitalize="none" autoCorrect={false} accessibilityLabel={m.hint}
            style={{ flex: 1, height: 48, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }} />
          {saved && saved === handle ? <Icon name="tick" size={16} color={colors.green} stroke={3} /> : null}
        </View>
        <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>Saved for next time. Peri only keeps the username.</T>

        <View style={{ flex: 1, minHeight: 20 }} />
        {askSent ? (
          <View style={{ gap: 8 }}>
            <T w="extrabold" style={{ fontSize: 16, textAlign: "center", marginBottom: 4 }}>Did the payment go through in {m.label}?</T>
            <PrimaryButton label={`Yes, I sent ${money(amount)}`} icon="tick" iconLeft onPress={sent} />
            <SoftButton label="Not yet" onPress={() => { setAskSent(false); setOpened(false); }} />
          </View>
        ) : (
          <>
            <PrimaryButton label={`Pay ${money(amount)} in ${m.label}`} icon="arrow" disabled={!p || !handle || !amount} onPress={pay} />
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
