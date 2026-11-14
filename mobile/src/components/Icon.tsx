// Icons from the Peri design: stroke icons plus the Peri orbit logo.
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

export type IconName =
  | "orbit" | "contacts" | "mic" | "chat" | "band" | "bell" | "plus" | "back" | "close" | "search" | "check" | "tick"
  | "send" | "phone" | "gift" | "dollar" | "calendar" | "task" | "pin" | "speaker" | "play" | "pause" | "wave"
  | "question" | "chevronRight" | "chevronDown" | "arrow" | "edit" | "lock" | "sparkle" | "people" | "lines" | "file";

export function Icon({ name, size = 20, color = "#111111", stroke = 2.2, fill = "none" }: {
  name: IconName; size?: number; color?: string; stroke?: number; fill?: string;
}) {
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "orbit" && (<><Circle cx="12" cy="12" r="3" fill={color} /><Ellipse {...p} cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)" /></>)}
      {(name === "contacts" || name === "people") && <Path {...p} d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0" />}
      {name === "mic" && (<><Rect {...p} x="9" y="3" width="6" height="11" rx="3" /><Path {...p} d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>)}
      {name === "chat" && (<><Path {...p} d="M4 5h16v11H10l-5 4v-4H4z" /><Path {...p} d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" /></>)}
      {name === "band" && (<><Rect {...p} x="4" y="9" width="16" height="6" rx="3" /><Path {...p} d="M8 9V5h8v4M8 15v4h8v-4" /></>)}
      {name === "bell" && (<><Path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><Path {...p} d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>)}
      {name === "plus" && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === "back" && <Path {...p} d="M15 6l-6 6 6 6" />}
      {name === "close" && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === "search" && (<><Circle {...p} cx="11" cy="11" r="7" /><Path {...p} d="M21 21l-4.5-4.5" /></>)}
      {name === "check" && (<><Circle {...p} fill={fill} cx="12" cy="12" r="9" /><Path {...p} d="M8 12.5l3 3 5-6" /></>)}
      {name === "tick" && <Path {...p} d="M20 6L9 17l-5-5" />}
      {name === "send" && (<><Path {...p} d="M22 2L11 13" /><Path {...p} d="M22 2l-7 20-4-9-9-4z" /></>)}
      {name === "phone" && <Path {...p} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />}
      {name === "gift" && (<><Rect {...p} x="3" y="8" width="18" height="4" rx="1" /><Path {...p} d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1" /></>)}
      {name === "dollar" && <Path {...p} d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 1.6 2.6 4.5 3.2 4.5 1.5 4.5 3.3-2 3-4.5 3-4.5-1.3-4.5-3" />}
      {name === "calendar" && (<><Rect {...p} x="3" y="5" width="18" height="16" rx="3" /><Path {...p} d="M3 10h18M8 3v4M16 3v4" /></>)}
      {name === "task" && <Path {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />}
      {name === "pin" && (<><Path {...p} d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><Circle {...p} cx="12" cy="9.5" r="2.5" /></>)}
      {name === "speaker" && (<><Path {...p} d="M11 5L6 9H3v6h3l5 4z" /><Path {...p} d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>)}
      {name === "play" && <Path {...p} fill={color} d="M7 5l12 7-12 7z" />}
      {name === "pause" && <Path {...p} d="M8 5v14M16 5v14" />}
      {name === "wave" && <Path {...p} d="M3 12h2M7 8v8M11 4v16M15 8v8M19 10v4" />}
      {name === "question" && (<><Path {...p} d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><Circle cx="12" cy="17.5" r="1.1" fill={color} /></>)}
      {name === "chevronRight" && <Path {...p} d="M9 6l6 6-6 6" />}
      {name === "chevronDown" && <Path {...p} d="M6 9l6 6 6-6" />}
      {name === "arrow" && <Path {...p} d="M5 12h14M13 6l6 6-6 6" />}
      {name === "edit" && <Path {...p} d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />}
      {name === "lock" && (<><Rect {...p} x="5" y="11" width="14" height="10" rx="2.5" /><Path {...p} d="M8 11V8a4 4 0 0 1 8 0v3" /></>)}
      {name === "sparkle" && <Path {...p} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />}
      {name === "lines" && <Path {...p} d="M4 7h16M4 12h16M4 17h10" />}
      {name === "file" && (<><Path {...p} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><Path {...p} d="M14 3v5h5" /></>)}
    </Svg>
  );
}

// Peri's logo: a planet with an orbit and an orange satellite.
export function PeriMark({ size = 40, bg = "#111111", fg = "#FFFFFF" }: { size?: number; bg?: string | null; fg?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {bg ? <Rect x="0" y="0" width="100" height="100" rx="24" fill={bg} /> : null}
      <Ellipse cx="50" cy="50" rx="38" ry="16" transform="rotate(-28 50 50)" fill="none" stroke={fg} strokeWidth={4.5} />
      <Circle cx="50" cy="50" r="13" fill={fg} />
      <Circle cx="70.9" cy="27.3" r="7" fill="#F26A3D" stroke={bg ?? "#FFFFFF"} strokeWidth={3} />
    </Svg>
  );
}

export const typeIcon: Record<string, IconName> = { Money: "dollar", Gift: "gift", Task: "send", Plan: "calendar" };
