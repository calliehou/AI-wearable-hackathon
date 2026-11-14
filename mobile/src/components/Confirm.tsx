// Peri's own "Delete this promise?" sheet (instead of the system alert), built from the same
// pieces as the other sheets. Any screen calls useConfirmDelete()(todo, after?, onCancel?).
import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../data/store";
import type { Todo } from "../data/types";
import { colors, TYPE_TONE } from "../theme";
import { Icon, typeIcon } from "./Icon";
import { PrimaryButton, SoftButton, T } from "./ui";

const DANGER = "#C2410C";
type Ask = { todo: Todo; after?: () => void; onCancel?: () => void };
type ConfirmDelete = (todo: Todo, after?: () => void, onCancel?: () => void) => void;

const Ctx = createContext<ConfirmDelete>(() => undefined);
export const useConfirmDelete = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const [ask, setAsk] = useState<Ask | null>(null);
  // Keep the last promise on screen while the sheet slides away.
  const [shown, setShown] = useState<Todo | null>(null);

  const open: ConfirmDelete = (todo, after, onCancel) => { setShown(todo); setAsk({ todo, after, onCancel }); };
  const cancel = () => { ask?.onCancel?.(); setAsk(null); };
  const remove = () => {
    if (!ask) return;
    s.deletePromise(ask.todo.id).catch(() => undefined);
    ask.after?.();
    setAsk(null);
  };
  const t = ask?.todo ?? shown;

  return (
    <Ctx.Provider value={open}>
      {children}
      <Modal visible={!!ask} animationType="slide" transparent onRequestClose={cancel}>
        <Pressable accessibilityLabel="Cancel" onPress={cancel} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
        <View accessibilityViewIsModal style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#FBDDD9", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={22} color={DANGER} stroke={2.8} />
          </View>
          <T w="extrabold" style={{ fontSize: 22, marginTop: 14 }}>Delete this promise?</T>
          <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>It&apos;s removed from Peri for good.</T>
          {t && (
            <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 62, borderRadius: 18, backgroundColor: colors.card, paddingHorizontal: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: TYPE_TONE[t.type], alignItems: "center", justifyContent: "center" }}>
                <Icon name={typeIcon[t.type]} size={16} stroke={2.6} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={2}>{t.title}</T>
                <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                  {[t.personName && `To ${t.personName}`, `Due ${t.dueLabel.toLowerCase()}`].filter(Boolean).join(" · ")}
                </T>
              </View>
            </View>
          )}
          <PrimaryButton label="Delete promise" onPress={remove} style={{ marginTop: 20, backgroundColor: DANGER }} />
          <SoftButton label="Cancel" onPress={cancel} style={{ marginTop: 10 }} />
        </View>
      </Modal>
    </Ctx.Provider>
  );
}
