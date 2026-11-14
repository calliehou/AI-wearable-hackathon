// Illustrations from the design canvas: the money "ring" (with a tick when done) and the document stack.
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from "react-native-svg";

export function RingArt({ size = 232, done, darker }: { size?: number; done?: boolean; darker?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <ClipPath id="kA"><Circle cx="120" cy="112" r="96" /></ClipPath>
        <ClipPath id="kB"><Circle cx="120" cy="112" r="64" /></ClipPath>
      </Defs>
      <Ellipse cx="120" cy="222" rx="68" ry="9" fill="#7A2A0C" opacity={0.22} />
      <G clipPath="url(#kA)">
        <Circle cx="120" cy="112" r="96" fill={darker ? "#D9531F" : "#E8622A"} />
        <Circle cx="108" cy="100" r="96" fill="#FF8F57" />
      </G>
      <G clipPath="url(#kB)">
        <Circle cx="120" cy="112" r="64" fill="#4A22B8" />
        <Circle cx="110" cy="102" r="64" fill="#7C4DFF" />
      </G>
      {done ? (
        <>
          <Circle cx="120" cy="112" r="44" fill="#A98BFF" />
          <Circle cx="120" cy="112" r="32" fill="#FFFFFF" />
          <Path d="M105 113l11 11 20-23" stroke="#111111" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Circle cx="120" cy="112" r="40" fill="#A98BFF" />
          <Circle cx="120" cy="112" r="26" fill="#2FB4F0" />
          <Ellipse cx="112" cy="102" rx="9" ry="6" fill="#FFFFFF" opacity={0.55} />
        </>
      )}
      <Rect x="8" y="64" width="22" height="64" rx="11" fill="#FFD23F" transform="rotate(-14 19 96)" />
      <Rect x="212" y="92" width="20" height="52" rx="10" fill="#38B6F2" />
      <Rect x="186" y="22" width="16" height="36" rx="8" fill="#FFFFFF" />
    </Svg>
  );
}

export function DocArt({ size = 232 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Ellipse cx="120" cy="222" rx="68" ry="9" fill="#0B3B5C" opacity={0.2} />
      <G transform="rotate(-10 120 120)"><Rect x="62" y="30" width="116" height="150" rx="16" fill="#4D8BFF" /></G>
      <G transform="rotate(4 120 120)"><Rect x="58" y="34" width="116" height="150" rx="16" fill="#FFD23F" /></G>
      <G transform="rotate(-2 120 120)">
        <Rect x="62" y="38" width="116" height="150" rx="16" fill="#FFFFFF" />
        <Rect x="80" y="62" width="60" height="12" rx="6" fill="#111111" />
        <Rect x="80" y="84" width="80" height="8" rx="4" fill="#C9C9D1" />
        <Rect x="80" y="100" width="70" height="8" rx="4" fill="#C9C9D1" />
        <Rect x="80" y="124" width="36" height="36" rx="10" fill="#F26A3D" />
        <Rect x="124" y="124" width="36" height="36" rx="10" fill="#7C4DFF" />
      </G>
      <G transform="rotate(14 190 70)">
        <Path d="M170 70l44-20-14 46-12-14z" fill="#111111" />
        <Path d="M188 82l-2 14 8-8z" fill="#7C7C86" />
      </G>
    </Svg>
  );
}
