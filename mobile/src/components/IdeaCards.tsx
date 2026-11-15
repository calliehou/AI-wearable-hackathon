// Ask Peri's options as cards: a photo from the page (or a numbered tile until one is found),
// the idea, why it fits, a rough price and a button that opens the page.
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import type { Idea, IdeaKind } from "../data/api";
import type { Todo } from "../data/types";
import { colors, TYPE_TONE } from "../theme";
import { Icon, typeIcon, type IconName } from "./Icon";
import { T } from "./ui";

const KIND: Record<IdeaKind, { icon: IconName; tone: string }> = {
  product: { icon: "gift", tone: "#FBDDD9" },
  place: { icon: "pin", tone: "#CDEBFB" },
  recipe: { icon: "lines", tone: "#E2F2E7" },
  activity: { icon: "calendar", tone: "#EDE4FB" },
  other: { icon: "sparkle", tone: "#F3F1EC" },
};

export function IdeaCards({ ideas, finding }: { ideas: Idea[]; finding: boolean }) {
  return (
    <View style={{ marginHorizontal: -20 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={232} decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingVertical: 4 }}>
        {ideas.map((idea, i) => <Card key={`${i}-${idea.title}`} idea={idea} n={i + 1} />)}
      </ScrollView>
      {finding && (
        <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 6, paddingHorizontal: 20 }}>Finding links and photos…</T>
      )}
    </View>
  );
}

function Card({ idea, n }: { idea: Idea; n: number }) {
  const [broken, setBroken] = useState(false);
  const k = KIND[idea.kind] ?? KIND.other;
  const photo = idea.image && !broken;
  return (
    <View style={{ width: 220, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, overflow: "hidden" }}>
      <View style={{ height: 120, backgroundColor: k.tone, alignItems: "center", justifyContent: "center" }}>
        {photo ? (
          <Image source={{ uri: idea.image! }} onError={() => setBroken(true)} accessibilityIgnoresInvertColors
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
        ) : (
          <Icon name={k.icon} size={34} stroke={1.8} />
        )}
        <View style={{ position: "absolute", top: 10, left: 10, width: 28, height: 28, borderRadius: 10, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
          <T w="extrabold" style={{ fontSize: 13 }}>{n}</T>
        </View>
      </View>
      <View style={{ padding: 12, flex: 1 }}>
        <T w="extrabold" style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={2}>{idea.title}</T>
        <T w="medium" style={{ fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 3 }} numberOfLines={2}>{idea.why}</T>
        <View style={{ flex: 1, minHeight: 10 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <T w="extrabold" style={{ fontSize: 17 }}>{idea.price ?? ""}</T>
          <Pressable accessibilityRole="link" accessibilityLabel={`Open ${idea.title}${idea.source ? ` on ${idea.source}` : ""}`}
            onPress={() => Linking.openURL(idea.link).catch(() => undefined)}
            style={({ pressed }) => ({ height: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.8 : 1 })}>
            <T style={{ fontSize: 13, color: colors.white }}>{idea.source ? "View" : "Search"}</T>
            <Icon name="arrow" size={14} color={colors.white} stroke={2.4} />
          </Pressable>
        </View>
        <T w="medium" style={{ fontSize: 11, color: colors.muted, marginTop: 6 }} numberOfLines={1}>{idea.source ?? "Search results"}</T>
      </View>
    </View>
  );
}

// The promise the ideas are for, at the top of the chat.
export function PromiseHeader({ todo }: { todo: Todo }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 24, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: TYPE_TONE[todo.type], alignItems: "center", justifyContent: "center" }}>
        <Icon name={typeIcon[todo.type]} size={22} stroke={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <T w="medium" style={{ fontSize: 12, color: colors.muted }}>Ideas for your promise</T>
        <T w="extrabold" style={{ fontSize: 18, letterSpacing: -0.3 }} numberOfLines={2}>{todo.title}</T>
        <T w="medium" style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
          {[todo.type, todo.personName, todo.dueLabel].filter(Boolean).join(" · ")}
        </T>
      </View>
    </View>
  );
}
