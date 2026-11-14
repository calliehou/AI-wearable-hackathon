// Slowly rotating orbit rings with people on them (the planets stay upright).
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { colors } from "../theme";

export function useSpin(seconds: number, reverse = false) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => loop?.stop();
  }, [t, seconds]);
  const spin = t.interpolate({ inputRange: [0, 1], outputRange: reverse ? ["360deg", "0deg"] : ["0deg", "360deg"] });
  const counter = t.interpolate({ inputRange: [0, 1], outputRange: reverse ? ["0deg", "360deg"] : ["360deg", "0deg"] });
  return { spin, counter };
}

// One ring of diameter `size`, centred in its parent, with items spread around it.
export function Ring({ size, seconds, reverse, dashed, items }: {
  size: number; seconds: number; reverse?: boolean; dashed?: boolean; items: { key: string; node: ReactNode; size: number }[];
}) {
  const { spin, counter } = useSpin(seconds, reverse);
  const r = size / 2;
  return (
    <Animated.View pointerEvents="box-none" style={{
      position: "absolute", width: size, height: size, borderRadius: r, borderWidth: 1.5,
      borderStyle: dashed ? "dashed" : "solid", borderColor: dashed ? colors.ring : colors.line, transform: [{ rotate: spin }],
    }}>
      {items.map((it, i) => {
        const a = (i / Math.max(items.length, 1)) * Math.PI * 2 - Math.PI / 2 + (size % 7) * 0.3;
        return (
          <Animated.View key={it.key} style={{
            position: "absolute", left: r + r * Math.cos(a) - it.size / 2 - 1.5, top: r + r * Math.sin(a) - it.size / 2 - 1.5,
            transform: [{ rotate: counter }],
          }}>
            {it.node}
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

export function Centered({ size, children }: { size: number; children: ReactNode }) {
  return <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}
