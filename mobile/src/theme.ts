// Colours and type from the Peri design ("Keep your people in orbit").
export const colors = {
  ink: "#111111",
  satellite: "#F26A3D", // the orange dot: Peri's accent
  muted: "#6B6B76",
  soft: "#4A4A55",
  body: "#3A3A44",
  line: "#EFEFF2",
  ring: "#E4E4EA",
  card: "#F3F3F5",
  white: "#FFFFFF",
  grey: "#9A9AA5",
  greyRing: "#A8A8B3",
  dashed: "#B9B9C3",
  dot: "#D4D4DC",
  handle: "#DADAE0",
  glow: "#FFF6EE",
  green: "#7CC99A",
  rust: "#B5470F",
  // kept for screens that still use the older names
  orange: "#F26A3D",
  orangeDot: "#F26A3D",
  red: "#F26A3D",
  sheetHandle: "#DADAE0",
  blue: "#2F7BE5",
};

export const fonts = {
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
};

// Default circles (tags). Pastel fill for cards and avatars, a stronger dot for chips.
export const CIRCLE_DOTS: Record<string, string> = {
  Family: "#7CC99A",
  Friends: "#F5A54A",
  Work: "#6AB6E8",
  School: "#A993F0",
};
export const SWATCHES = ["#CDEBD6", "#FFE3B8", "#CDEBFB", "#E3D9FF", "#F9C9C4", "#FFF0B8"];

// Avatar colours, picked by name so a person always gets the same one.
const AVATARS = ["#FFE3B8", "#CDEBD6", "#CDEBFB", "#E3D9FF", "#F9C9C4", "#FFD9C9", "#FFF0B8"];

export function avatarColors(name: string | null, circleColor?: string): { bg: string; fg: string } {
  if (!name) return { bg: colors.white, fg: colors.ink };
  if (circleColor) return { bg: circleColor, fg: colors.ink };
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { bg: AVATARS[h % AVATARS.length], fg: colors.ink };
}

// The design's four kinds of promise.
export const TYPE_TONE: Record<string, string> = { Money: "#FFD9C9", Gift: "#F9C9C4", Task: "#CDEBFB", Plan: "#FFF0B8" };
export const CARD_TONE: Record<string, string> = { Money: "#FDE1D3", Gift: "#FBDDD9", Task: "#E3F0FB", Plan: "#E2F2E7" };
