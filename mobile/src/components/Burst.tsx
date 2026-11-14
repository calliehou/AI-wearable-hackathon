// The "bubble burst" when a promise is ticked: a ring pops outward and a spray of little
// dots flies off, while the row shrinks and fades. Skipped when Reduce Motion is on.
import { useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";

const DOTS = ["#F26A3D", "#F5A54A", "#7CC99A", "#6AB6E8", "#A993F0", "#F26A3D", "#FFD23F", "#6AB6E8"];

export function useBurst() {
  const [t] = useState(() => new Animated.Value(0)); // 0 → 1 over the burst
  const [active, setActive] = useState(false);

  async function play(done: () => void) {
    const reduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (reduce) { done(); return; }
    setActive(true);
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => done());
  }

  // Row: a quick "pop" bigger, then shrink and fade away.
  const rowStyle = active ? {
    opacity: t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1, 0] }),
    transform: [{ scale: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1.03, 0.85] }) }],
  } : null;

  return { t, active, play, rowStyle };
}

// Drawn on top of the row, centred on the checkbox (x, y within the row).
export function BurstLayer({ t, x, y }: { t: Animated.Value; x: number; y: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
      <Animated.View style={{
        position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: "#F26A3D",
        opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.9, 0.4, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] }) }],
      }} />
      {DOTS.map((c, i) => {
        const a = (i / DOTS.length) * Math.PI * 2;
        const dist = 46 + (i % 3) * 10;
        return (
          <Animated.View key={i} style={{
            position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: c,
            opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist] }) },
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
              { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.2, 0.6] }) },
            ],
          }} />
        );
      })}
    </View>
  );
}
