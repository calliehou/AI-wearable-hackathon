// Colours and type from the Peri design canvas.
export const colors = {
  ink: "#111111",
  muted: "#6B6B76",
  soft: "#4A4A55",
  body: "#3A3A44",
  line: "#F0F0F3",
  card: "#F3F3F5",
  white: "#FFFFFF",
  orange: "#EF6A31",
  orangeDot: "#F26A3D",
  rust: "#B5470F",
  red: "#F2402D",
  grey: "#9A9AA5",
  greyRing: "#A8A8B3",
  dashed: "#B9B9C3",
  blush: "#F8C9C2",
  sky: "#7CCBF3",
  sheetHandle: "#E4E4E9",
  blue: "#2F7BE5",
};

export const fonts = {
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
};

// Avatar colours, picked by name so a person always gets the same one.
const AVATARS: [string, string][] = [
  ["#2F7BE5", "#FFFFFF"],
  ["#FFE3B8", "#111111"],
  ["#CDEBD6", "#111111"],
  ["#E3D9FF", "#111111"],
  ["#FBD5CF", "#111111"],
  ["#FFD9C9", "#111111"],
  ["#CDEBFB", "#111111"],
  ["#FFF0B8", "#111111"],
];

export function avatarColors(name: string | null): { bg: string; fg: string } {
  if (!name) return { bg: colors.white, fg: colors.ink };
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATARS[h % AVATARS.length];
  return { bg, fg };
}

// Icon tile colour for each kind of promise.
export const kindTile: Record<string, string> = {
  money: "#FFD9C9",
  send: "#CDEBFB",
  call: "#FFF0B8",
  bring: "#E3D9FF",
  meet: "#CDEBD6",
  other: "#F3F3F5",
};
