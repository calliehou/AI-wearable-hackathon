// 03 · Person: where they sit in your orbit, open promises, a spoken recap of your recent
// time together (ElevenLabs), and what Peri remembers about them.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, typeIcon } from "../../components/Icon";
import { Avatar, Header, Pill, T } from "../../components/ui";
import { WhoPicker } from "../../components/WhoPicker";
import { RenameSheet } from "../../components/RenameSheet";
import { CirclePicker } from "../../components/CirclePicker";
import { OrbitPicker } from "../../components/OrbitPicker";
import { MergeSheet } from "../../components/MergeSheet";
import { PromiseListSheet } from "../../components/PromiseListSheet";
import { useConfirmDelete } from "../../components/Confirm";
import { fetchAbout, fetchRecap, type About } from "../../data/api";
import { useStore } from "../../data/store";
import { colors, TYPE_TONE } from "../../theme";

const ORBIT = ["", "Inner orbit", "Middle orbit", "Outer orbit"];

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const confirmDelete = useConfirmDelete();
  const insets = useSafeAreaInsets();
  const p = s.person(id);
  const [about, setAbout] = useState<About | null>(null);
  const [aboutError, setAboutError] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [recapText, setRecapText] = useState("");
  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [circling, setCircling] = useState(false);
  const [orbiting, setOrbiting] = useState(false);
  const [listing, setListing] = useState<"open" | "kept" | null>(null);
  const [merging, setMerging] = useState(false);
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const name = p?.name;

  useEffect(() => {
    if (!name) return;
    let live = true;
    fetchAbout(name).then((a) => live && setAbout(a)).catch((e) => live && setAboutError((e as Error).message));
    return () => { live = false; Speech.stop(); };
  }, [name]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the player tells us the recap ended
    if (status.didJustFinish) setPlaying(false);
  }, [status.didJustFinish]);

  if (!p) return <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}><Header /></View>;
  const open = s.openFor(p.id);
  const first = p.name.split(" ")[0];
  const named = s.todos.filter((t) => t.personId === p.id && t.personSource === "named" && t.status !== "dismissed");

  async function recap() {
    if (playing) { player.pause(); Speech.stop(); setPlaying(false); return; }
    setLoadingRecap(true); setNote("");
    try {
      const r = await fetchRecap(p!.name);
      setRecapText(r.text);
      setPlaying(true);
      if (r.audio) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        player.replace({ uri: r.audio });
        player.seekTo(0);
        player.play();
      } else {
        if (r.note) setNote(r.note);
        Speech.speak(r.text, { onDone: () => setPlaying(false) });
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setLoadingRecap(false);
    }
  }

  const places = about?.places.length ?? 0;
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: insets.top }}>
      <Header right={places ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/places/[id]", params: { id: p.id } })}
          style={{ height: 40, borderRadius: 20, backgroundColor: colors.card, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="pin" size={15} stroke={2.4} />
          <T style={{ fontSize: 13 }}>{places} place{places === 1 ? "" : "s"}</T>
        </Pressable>
      ) : null} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
        <View style={{ alignItems: "center" }}>
          <Avatar name={p.name} size={96} color={s.personColor(p)} badge={p.open || undefined} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit name: ${p.name}`} onPress={() => setRenaming(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, minHeight: 44 }}>
            <T w="extrabold" style={{ fontSize: 30, letterSpacing: -0.8 }}>{p.name}</T>
            <Icon name="edit" size={18} color={colors.muted} />
          </Pressable>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 }}>
            {p.circles.map((c) => <Pill key={c} label={c} bg={s.circleColor(c) ?? colors.card} onPress={() => setCircling(true)} />)}
            <Pill label={p.circles.length ? "Circles" : "Add to a circle"} dashed onPress={() => setCircling(true)} />
            <Pill label={`${ORBIT[p.ring]}${p.ring === 1 ? " ↑" : ""} ▾`} bg={p.ring === 1 ? "#FFF1E8" : colors.card} onPress={() => setOrbiting(true)} />
          </View>
        </View>

        {named.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => setPicking(true)}
            style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: "#FFF1E8", borderWidth: 1.5, borderColor: "#F9C9A8" }}>
            <Icon name="contacts" size={20} />
            <View style={{ flex: 1 }}>
              <T w="extrabold" style={{ fontSize: 14 }}>Which {p.name}? Pick from contacts</T>
              <T w="medium" style={{ fontSize: 12, color: colors.soft, marginTop: 2 }}>You said “{p.name}”; choose the right contact for {named.length === 1 ? "this promise" : `these ${named.length} promises`}</T>
            </View>
            <Icon name="chevronRight" size={18} color={colors.grey} stroke={2.4} />
          </Pressable>
        )}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
          <Stat big={String(p.open)} small="open" onPress={() => setListing("open")} />
          <Stat big={String(p.kept)} small="kept" onPress={() => setListing("kept")} />
          <Stat big={p.lastTalk} small="last talk" />
        </View>

        <View style={{ marginTop: 12, minHeight: 64, borderRadius: 22, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={playing ? "Stop the recap" : "Play a recap of recent activity"} onPress={recap}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.satellite, alignItems: "center", justifyContent: "center" }}>
            {loadingRecap ? <ActivityIndicator color={colors.ink} /> : <Icon name={playing ? "pause" : "speaker"} size={18} stroke={2.4} />}
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 16, color: colors.white }}>{playing ? "Playing recap…" : "Recent activity"}</T>
            <T w="medium" style={{ fontSize: 12, color: "#BDBDC6", marginTop: 2 }}>{p.moments} moment{p.moments === 1 ? "" : "s"} logged this month</T>
          </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Show the log" onPress={() => setShowLog(true)} hitSlop={8}
            style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center" }}>
            <T style={{ fontSize: 12, color: colors.white }}>Log</T>
          </Pressable>
        </View>
        {note ? <T w="semibold" style={{ fontSize: 12, color: colors.muted, marginTop: 6, textAlign: "center" }}>{note}</T> : null}
        {playing && recapText ? <T w="medium" style={{ fontSize: 13, color: colors.body, lineHeight: 19, marginTop: 8 }}>{recapText}</T> : null}

        {open.length > 0 && <T w="extrabold" style={{ fontSize: 17, marginTop: 24, marginBottom: 10 }}>Open promises</T>}
        <View style={{ gap: 8 }}>
          {open.map((t) => {
            const cta = t.type === "Money" ? "Pay" : t.type === "Gift" ? "Ideas" : "Open";
            const go = () => t.type === "Money" ? router.push({ pathname: "/transfer/[id]", params: { id: t.id } })
              : t.type === "Gift" ? router.push({ pathname: "/gifts/[id]", params: { id: p.id } })
              : router.push({ pathname: "/promise/[id]", params: { id: t.id } });
            return (
              <Pressable key={t.id} accessibilityRole="button" accessibilityHint="Long press to delete" onPress={() => router.push({ pathname: "/promise/[id]", params: { id: t.id } })}
                onLongPress={() => confirmDelete(t)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, borderRadius: 20, backgroundColor: colors.card, paddingHorizontal: 14 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: TYPE_TONE[t.type], alignItems: "center", justifyContent: "center" }}>
                  <Icon name={typeIcon[t.type]} size={18} stroke={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <T w="extrabold" style={{ fontSize: 15 }} numberOfLines={1}>{t.title}</T>
                  <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{t.dueLabel}{t.dueDetail ? ` · ${t.dueDetail}` : ""}{t.type === "Money" ? " · you owe" : ""}</T>
                </View>
                <Pressable accessibilityRole="button" onPress={go} hitSlop={6}
                  style={{ height: 34, borderRadius: 17, paddingHorizontal: 14, backgroundColor: colors.ink, justifyContent: "center" }}>
                  <T style={{ fontSize: 13, color: colors.white }}>{cta}</T>
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 24, marginBottom: 10 }}>
          <T w="extrabold" style={{ fontSize: 17 }}>About {first}</T>
          <T style={{ fontSize: 12, color: colors.muted }}>Peri remembers</T>
        </View>
        <View style={{ borderWidth: 1.5, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4 }}>
          {!about && !aboutError ? <ActivityIndicator style={{ marginVertical: 18 }} color={colors.ink} /> : null}
          {aboutError ? <T w="medium" style={{ fontSize: 13, color: colors.muted, marginVertical: 14 }}>{aboutError}</T> : null}
          {about && !about.who && !about.right_now && !about.good_to_know && !about.interests.length && (
            <T w="medium" style={{ fontSize: 13, color: colors.muted, marginVertical: 14 }}>Peri learns about {first} from your conversations. Nothing yet.</T>
          )}
          {about?.who ? <Fact k="Who" v={about.who} /> : null}
          {about?.right_now ? <Fact k="Right now" v={about.right_now} /> : null}
          {about?.good_to_know ? <Fact k="Good to know" v={about.good_to_know} /> : null}
          {about?.interests.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 12 }}>
              {about.interests.map((i) => <Pill key={i} label={i} />)}
            </View>
          ) : null}
        </View>
        {!!(p.phone || p.email) && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {p.phone ? <Pill label={`Call ${first}`} onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
            {p.email ? <Pill label="Email" onPress={() => Linking.openURL(`mailto:${p.email}`)} /> : null}
          </View>
        )}
        <Pressable accessibilityRole="button" onPress={() => setMerging(true)}
          style={{ marginTop: 18, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line }}>
          <Icon name="contacts" size={18} color={colors.soft} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" style={{ fontSize: 14 }}>Merge with another contact</T>
            <T w="medium" style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Same person under two names? Combine them.</T>
          </View>
          <Icon name="chevronRight" size={18} color={colors.grey} stroke={2.4} />
        </Pressable>
      </ScrollView>

      <PromiseListSheet visible={listing !== null} onClose={() => setListing(null)}
        title={listing === "kept" ? `Kept with ${first}` : `Still to do for ${first}`}
        empty={listing === "kept" ? `No kept promises with ${first} yet.` : `Nothing open with ${first}. You're all caught up.`}
        todos={s.todos.filter((t) => t.personId === p.id && t.status === (listing === "kept" ? "done" : "open"))} />
      <MergeSheet person={p} visible={merging} onClose={() => setMerging(false)}
        onMerged={(id) => router.replace({ pathname: "/person/[id]", params: { id } })} />

      <WhoPicker key={String(picking)} visible={picking} title={`Which ${p.name}?`} initialQuery={p.name}
        onClose={() => setPicking(false)}
        onPick={async (n) => {
          for (const t of named) await s.setTodoPerson(t.id, { name: n });
          setPicking(false);
          router.back();
        }} />

      <CirclePicker person={p} visible={circling} onClose={() => setCircling(false)} />
      <OrbitPicker person={p} visible={orbiting} onClose={() => setOrbiting(false)} />

      <RenameSheet key={`rename-${renaming}`} visible={renaming} name={p.name} onClose={() => setRenaming(false)}
        onSave={async (to) => { const nid = await s.renamePerson(p.name, to); router.replace({ pathname: "/person/[id]", params: { id: nid } }); }} />

      <Modal visible={showLog} animationType="slide" transparent onRequestClose={() => setShowLog(false)}>
        <Pressable accessibilityLabel="Close" onPress={() => setShowLog(false)} style={{ flex: 1, backgroundColor: "rgba(17,17,17,0.35)" }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 20, maxHeight: "75%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T w="extrabold" style={{ fontSize: 20 }}>Recent with {first}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowLog(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <Icon name="close" size={16} stroke={2.6} />
            </Pressable>
          </View>
          <ScrollView style={{ marginTop: 10 }}>
            {(about?.log ?? []).map((e, i) => (
              <View key={e.id} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: colors.card }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: ["#F26A3D", "#F5A54A", "#7CC99A", "#6AB6E8"][i % 4] }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <T w="extrabold" style={{ fontSize: 14, flex: 1 }}>{e.title}</T>
                    <T w="medium" style={{ fontSize: 12, color: colors.muted }}>{e.when}</T>
                  </View>
                  <T w="medium" style={{ fontSize: 13, color: colors.soft, marginTop: 3, lineHeight: 18 }} numberOfLines={1}>{firstSentence(e.note)}</T>
                </View>
              </View>
            ))}
            {!about?.log.length && <T w="medium" style={{ fontSize: 14, color: colors.muted, marginTop: 8 }}>No conversations with {first} this month yet.</T>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// One short line per conversation in the log.
function firstSentence(text: string) {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

function Stat({ big, small, onPress }: { big: string; small: string; onPress?: () => void }) {
  const body = (
    <>
      <T w="extrabold" style={{ fontSize: 20 }}>{big}</T>
      <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>{small}{onPress ? " ›" : ""}</T>
    </>
  );
  const style = { flex: 1, height: 64, borderRadius: 20, backgroundColor: colors.card, alignItems: "center" as const, justifyContent: "center" as const };
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${big} ${small}. Show the list`} onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}>{body}</Pressable>
  ) : <View style={style}>{body}</View>;
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: colors.card }}>
      <T w="semibold" style={{ fontSize: 12, color: colors.muted }}>{k}</T>
      <T w="semibold" style={{ fontSize: 14, marginTop: 3, lineHeight: 20 }}>{v}</T>
    </View>
  );
}
