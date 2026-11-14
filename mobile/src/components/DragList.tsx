// A vertical list you can reorder by dragging each row's grip handle. Built on React Native's
// PanResponder (no extra packages, works in Expo Go). The page should stop scrolling while a
// row is dragged: onDragging(true/false) tells the parent.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PanResponder, View, type GestureResponderHandlers, type LayoutChangeEvent, type PanResponderInstance } from "react-native";

export type Handle = { handlers: GestureResponderHandlers; dragging: boolean };
type Drag = { index: number; dy: number };

// Where the dragged row would land: walk past neighbours until half of one is crossed.
function targetOf(index: number, dy: number, keys: string[], heights: Record<string, number>, gap: number) {
  let target = index;
  let moved = dy;
  const h = (k: string) => (heights[k] ?? 70) + gap;
  if (dy > 0) {
    for (let i = index + 1; i < keys.length; i++) {
      if (moved > h(keys[i]) / 2) { target = i; moved -= h(keys[i]); } else break;
    }
  } else {
    for (let i = index - 1; i >= 0; i--) {
      if (-moved > h(keys[i]) / 2) { target = i; moved += h(keys[i]); } else break;
    }
  }
  return target;
}

export function DragList<T>({ items, keyOf, render, onReorder, onDragging, gap = 8 }: {
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T, handle: Handle) => ReactNode;
  onReorder: (keys: string[]) => void;
  onDragging?: (dragging: boolean) => void;
  gap?: number;
}) {
  const keys = items.map(keyOf);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  // The touch handlers live outside React's render: they read the latest list from here.
  const latest = useRef({ keys, heights, onReorder, onDragging, gap });
  const live = useRef<Drag | null>(null);
  useEffect(() => { latest.current = { keys, heights, onReorder, onDragging, gap }; });

  const [responders] = useState(() => new Map<string, PanResponderInstance>());
  const responderFor = (key: string) => {
    let r = responders.get(key);
    if (!r) {
      const finish = () => {
        const d = live.current;
        live.current = null;
        setDrag(null);
        latest.current.onDragging?.(false);
        if (!d) return;
        const L = latest.current;
        const target = targetOf(d.index, d.dy, L.keys, L.heights, L.gap);
        if (target === d.index) return;
        const next = [...L.keys];
        const [moved] = next.splice(d.index, 1);
        next.splice(target, 0, moved);
        L.onReorder(next);
      };
      r = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          live.current = { index: latest.current.keys.indexOf(key), dy: 0 };
          setDrag(live.current);
          latest.current.onDragging?.(true);
        },
        onPanResponderMove: (_e, g) => {
          if (!live.current) return;
          live.current = { index: live.current.index, dy: g.dy };
          setDrag(live.current);
        },
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      });
      responders.set(key, r);
    }
    return r;
  };

  const target = drag ? targetOf(drag.index, drag.dy, keys, heights, gap) : -1;
  const activeH = drag ? (heights[keys[drag.index]] ?? 70) + gap : 0;

  return (
    <View style={{ gap }}>
      {/* eslint-disable-next-line react-hooks/refs -- the PanResponders are created once and only read refs when touched */}
      {items.map((item, i) => {
        const key = keys[i];
        const active = drag?.index === i;
        // Rows between the start and the target slide over to make room.
        let shift = 0;
        if (drag && !active) {
          if (drag.index < i && i <= target) shift = -activeH;
          if (target <= i && i < drag.index) shift = activeH;
        }
        return (
          <View key={key}
            onLayout={(e: LayoutChangeEvent) => {
              const h = e.nativeEvent.layout.height;
              setHeights((all) => (all[key] === h ? all : { ...all, [key]: h }));
            }}
            style={{
              zIndex: active ? 10 : 0,
              transform: [{ translateY: active ? drag.dy : shift }],
              shadowColor: "#111111", shadowOpacity: active ? 0.18 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
              elevation: active ? 8 : 0,
            }}>
            {render(item, { handlers: responderFor(key).panHandlers, dragging: active })}
          </View>
        );
      })}
    </View>
  );
}
