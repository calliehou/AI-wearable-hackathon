// Slide a row to the left to reveal Delete. Past the threshold it asks onDelete (which can
// confirm); otherwise it springs back. Only clearly sideways moves count, so vertical
// scrolling and the drag handle keep working.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, View, type PanResponderInstance } from "react-native";
import { colors } from "../theme";
import { Icon } from "./Icon";
import { T } from "./ui";

const THRESHOLD = 110;

export function SwipeToDelete({ children, onDelete, label }: {
  children: ReactNode; onDelete: (reset: () => void) => void; label: string;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const latest = useRef(onDelete);
  useEffect(() => { latest.current = onDelete; });

  // eslint-disable-next-line react-hooks/refs -- the PanResponder is created once and only reads the ref when touched
  const [responder] = useState<PanResponderInstance>(() => {
    const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => x.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -THRESHOLD) {
          Animated.timing(x, { toValue: -THRESHOLD - 20, duration: 120, useNativeDriver: true }).start(() => latest.current(reset));
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    });
  });

  return (
    <View accessibilityHint="Swipe left to delete" accessibilityActions={[{ name: "delete", label }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === "delete" && latest.current(() => undefined)}>
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 22, backgroundColor: "#E5484D",
        flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 22, gap: 6 }}>
        <Icon name="close" size={16} color={colors.white} stroke={2.8} />
        <T style={{ fontSize: 14, color: colors.white }}>Delete</T>
      </View>
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
