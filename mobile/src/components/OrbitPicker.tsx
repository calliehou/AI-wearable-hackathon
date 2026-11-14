// Choose where someone sits in your orbit, or let Peri decide (open promises, how often you talk).
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import type { Person } from "../data/types";
import { colors } from "../theme";
import { Icon } from "./Icon";
import { T } from "./ui";

const OPTIONS: { ring: 1 | 2 | 3 | null; label: string; sub: string; ringSize: number }[] = [
  { ring: 1, label: "Inner orbit", sub: "Closest: shown right next to you", ringSize: 16 },
  { ring: 2, label: "Middle orbit", sub: "People you see now and then", ringSize: 24 },
  { ring: 3, label: "Outer orbit", sub: "Further away for now", ringSize: 32 },
  { ring: null, label: "Automatic", sub: "Peri decides from open promises and how often you talk", ringSize: 0 },
];

export function OrbitPicker({ person, visible, onClose }: { person: Person; visible: boolean; onClose: () => void }) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const current: 1 | 2 | 3 | null = person.ringChosen ? person.ring : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16 }}>
        <T w="extrabold" style={{ fontSize: 20 }}>{person.name.split(" ")[0]}&apos;s orbit</T>
        <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Where they sit on your My orbit rings.</T>
        <View style={{ gap: 8, marginTop: 14 }}>
          {OPTIONS.map((o) => {
            const on = current === o.ring;
            return (
              <Pressable key={o.label} accessibilityRole="radio" accessibilityState={{ checked: on }}
                onPress={() => { s.setOrbit(person.name, o.ring); onClose(); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 62, borderRadius: 18, paddingHorizontal: 14,
                  backgroundColor: o.ring === 1 ? "#FFF1E8" : colors.card, borderWidth: 2.5, borderColor: on ? colors.ink : "transparent" }}>
                <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                  {o.ring ? (
                    <>
                      <View style={{ position: "absolute", width: o.ringSize + 4, height: o.ringSize + 4, borderRadius: 20, borderWidth: 1.5, borderColor: colors.greyRing }} />
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink }} />
                    </>
                  ) : <Icon name="sparkle" size={20} stroke={2.2} />}
                </View>
                <View style={{ flex: 1 }}>
                  <T w="extrabold" style={{ fontSize: 15 }}>{o.label}</T>
                  <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{o.sub}</T>
                </View>
                {on ? <Icon name="tick" size={18} stroke={3} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
