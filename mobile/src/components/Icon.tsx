// Stroke icons from the design canvas.
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "bell" | "plus" | "send" | "phone" | "bag" | "home" | "people" | "check" | "band" | "back"
  | "edit" | "lines" | "chevronDown" | "chevronRight" | "arrow" | "speaker" | "search" | "close"
  | "wave" | "mic" | "stop" | "play" | "pause" | "tick" | "file" | "question";

export function Icon({ name, size = 20, color = "#111111", stroke = 2.2, fill = "none" }: {
  name: IconName; size?: number; color?: string; stroke?: number; fill?: string;
}) {
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "bell" && (<><Path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><Path {...p} d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>)}
      {name === "plus" && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === "send" && (<><Path {...p} d="M22 2L11 13" /><Path {...p} d="M22 2l-7 20-4-9-9-4z" /></>)}
      {name === "phone" && <Path {...p} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />}
      {name === "bag" && (<><Path {...p} d="M6 8h12l1 12H5L6 8z" /><Path {...p} d="M9 8a3 3 0 0 1 6 0" /></>)}
      {name === "home" && <Path {...p} fill={fill} d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />}
      {name === "people" && (<><Circle {...p} fill={fill} cx="9" cy="8" r="3.5" /><Path {...p} fill={fill} d="M2.5 20a6.5 6.5 0 0 1 13 0z" /><Path {...p} d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>)}
      {name === "check" && (<><Circle {...p} fill={fill} cx="12" cy="12" r="9" /><Path {...p} stroke={fill !== "none" ? "#111111" : color} d="M8 12.5l3 3 5-6" /></>)}
      {name === "band" && (<><Rect {...p} x="4" y="9" width="16" height="6" rx="3" /><Path {...p} d="M8 9V5h8v4M8 15v4h8v-4" /></>)}
      {name === "back" && <Path {...p} d="M15 6l-6 6 6 6" />}
      {name === "edit" && <Path {...p} d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />}
      {name === "lines" && <Path {...p} d="M4 7h16M4 12h16M4 17h10" />}
      {name === "chevronDown" && <Path {...p} d="M6 9l6 6 6-6" />}
      {name === "chevronRight" && <Path {...p} d="M9 6l6 6-6 6" />}
      {name === "arrow" && <Path {...p} d="M5 12h14M13 6l6 6-6 6" />}
      {name === "speaker" && (<><Path {...p} d="M11 5L6 9H3v6h3l5 4z" /><Path {...p} d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>)}
      {name === "search" && (<><Circle {...p} cx="11" cy="11" r="7" /><Path {...p} d="M21 21l-4.5-4.5" /></>)}
      {name === "close" && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === "wave" && <Path {...p} d="M3 12h2M7 8v8M11 4v16M15 8v8M19 10v4" />}
      {name === "mic" && (<><Rect {...p} x="9" y="3" width="6" height="12" rx="3" /><Path {...p} d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>)}
      {name === "play" && <Path {...p} fill={color} d="M7 5l12 7-12 7z" />}
      {name === "pause" && <Path {...p} d="M8 5v14M16 5v14" />}
      {name === "tick" && <Path {...p} d="M20 6L9 17l-5-5" />}
      {name === "file" && (<><Path {...p} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><Path {...p} d="M14 3v5h5" /></>)}
      {name === "question" && (<><Path {...p} d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><Circle cx="12" cy="17.5" r="1.1" fill={color} /></>)}
    </Svg>
  );
}

export const kindIcon = { money: "wave", send: "send", call: "phone", bring: "bag", meet: "people", other: "lines" } as const;
