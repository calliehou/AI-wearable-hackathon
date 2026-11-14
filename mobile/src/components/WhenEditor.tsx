// "When" on a promise: its day and time, each editable with the phone's own picker.
// Filled in automatically when the conversation said a day or time.
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { Icon } from "./Icon";
import { PrimaryButton, T, TextButton } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function dueDateTime(date: string | null, time: string | null): Date {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  } else if (!date) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

export function WhenEditor({ date, time, onChange }: {
  date: string | null; time: string | null;
  onChange: (change: { due_date?: string | null; due_time?: string | null }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState<"date" | "time" | null>(null);
  const [temp, setTemp] = useState(() => dueDateTime(date, time));

  const dayText = date ? new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) : "Not set";
  const timeText = time ? dueDateTime(date, time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not set";

  function open(which: "date" | "time") {
    setTemp(dueDateTime(date, time));
    setPick(which);
  }
  function save(d: Date, which: "date" | "time") {
    if (which === "date") onChange({ due_date: toDateStr(d) });
    else onChange({ due_time: toTimeStr(d), ...(date ? {} : { due_date: toDateStr(d) }) });
    setPick(null);
  }

  const row = (which: "date" | "time", label: string, value: string, set: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderBottomWidth: which === "date" ? 1.5 : 0, borderBottomColor: colors.card }}>
      <Icon name={which === "date" ? "calendar" : "bell"} size={18} color={colors.muted} />
      <T w="semibold" style={{ fontSize: 14, color: colors.muted, width: 44 }}>{label}</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change`} onPress={() => Platform.OS !== "web" && open(which)} style={{ flex: 1, minHeight: 44, justifyContent: "center" }}>
        <T w="extrabold" style={{ fontSize: 15, color: set ? colors.ink : colors.muted }}>{value}</T>
      </Pressable>
      {set ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label.toLowerCase()}`} hitSlop={8}
          onPress={() => onChange(which === "date" ? { due_date: null } : { due_time: null })}
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={12} color={colors.muted} stroke={2.6} />
        </Pressable>
      ) : (
        <Icon name="chevronRight" size={16} color={colors.grey} stroke={2.4} />
      )}
    </View>
  );

  return (
    <View style={{ marginTop: 12, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14 }}>
      {row("date", "Day", dayText, !!date)}
      {row("time", "Time", timeText, !!time)}

      {/* Android: the system dialog opens by itself while the picker is rendered. */}
      {Platform.OS === "android" && pick && (
        <DateTimePicker value={temp} mode={pick} onValueChange={(_e, d) => save(d, pick)} onDismiss={() => setPick(null)} />
      )}

      {/* iOS: a sheet with the wheel and Save. */}
      {Platform.OS === "ios" && (
        <Modal visible={!!pick} animationType="slide" transparent onRequestClose={() => setPick(null)}>
          <Pressable accessibilityLabel="Close" onPress={() => setPick(null)} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
          <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16 }}>
            <T w="extrabold" style={{ fontSize: 20 }}>{pick === "date" ? "Which day?" : "What time?"}</T>
            {pick && (
              <DateTimePicker value={temp} mode={pick} display="spinner" themeVariant="light" minuteInterval={5}
                onValueChange={(_e, d) => setTemp(d)} style={{ alignSelf: "stretch" }} />
            )}
            <PrimaryButton label="Save" onPress={() => pick && save(temp, pick)} />
            <TextButton label="Cancel" onPress={() => setPick(null)} />
          </View>
        </Modal>
      )}
    </View>
  );
}
