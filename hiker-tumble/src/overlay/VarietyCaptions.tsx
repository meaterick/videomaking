import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Cam } from "../camera/shots";
import { hikerFK, pineconeState, SQUIRREL_HEAD } from "../character/performance";
import { FONT_BODY, FONT_TITLE } from "../fonts";
import { add3, clamp, noise1, V3 } from "../lib/anim";
import { realTime, worldTime } from "../timeline";
import { project } from "./project";

// Korean variety-show style captions (예능 자막) and comic onomatopoeia.
type Style = "pink" | "yellow" | "cyan" | "freeze" | "boom" | "boomBig";
type Cue = {
  text: string;
  start: number; // real seconds
  end: number;
  style: Style;
  anchor?: (tw: number) => V3;
  screen?: [number, number]; // fraction of the frame
  offset?: [number, number]; // px from the anchor
  rotate?: number; // deg
  size?: number;
  battery?: boolean;
};

const head = (dy = 0.55) => (tw: number) => {
  const h = hikerFK(tw).head;
  return [h.x, h.y + dy, h.z] as V3;
};

export const CUES: Cue[] = [
  { text: "(체력 3% 남음)", start: 8.6, end: 10.9, style: "cyan", anchor: head(0.5), offset: [-40, -70], rotate: -4, battery: true },
  { text: "(자신감 MAX)", start: 12.7, end: 15.0, style: "pink", anchor: head(0.45), offset: [250, 10], rotate: 6, size: 78 },
  { text: "(솔방울 발견 못함)", start: 21.55, end: 23.0, style: "yellow", anchor: (tw) => add3(pineconeState(tw).pos, [0, 0.12, 0]), offset: [0, -190], rotate: -3 },
  { text: "(하산 시작)", start: 24.62, end: 25.9, style: "freeze", screen: [0.5, 0.2], size: 92 },
  { text: "데굴데굴~", start: 27.2, end: 30.2, style: "boom", anchor: head(0.2), offset: [-60, -170], rotate: -8, size: 104 },
  { text: "(초고속 하산 중)", start: 31.0, end: 32.9, style: "cyan", screen: [0.27, 0.14], rotate: -3 },
  { text: "쿵!", start: realTime(31.7), end: 33.6, style: "boomBig", screen: [0.62, 0.3], rotate: 10, size: 190 },
  { text: "(모자 득템)", start: 35.45, end: 37.2, style: "yellow", anchor: () => add3(SQUIRREL_HEAD, [0, 0.12, 0]), offset: [300, -150], rotate: 5, size: 80 },
  { text: "휘이잉~", start: 38.5, end: 39.9, style: "boom", screen: [0.72, 0.22], rotate: 6, size: 110 },
  { text: "푹!", start: realTime(39.3), end: realTime(39.3) + 0.9, style: "boomBig", screen: [0.5, 0.26], rotate: -6, size: 200 },
  { text: "(원점 복귀)", start: 47.4, end: 49.5, style: "pink", screen: [0.5, 0.17], rotate: -2, size: 96 },
  { text: "딱!", start: realTime(48.8), end: realTime(48.8) + 0.6, style: "boom", anchor: head(0.55), offset: [150, -90], rotate: 12, size: 120 },
  { text: "(진정한 승자)", start: 55.9, end: 58.3, style: "yellow", anchor: () => add3(SQUIRREL_HEAD, [0, 0.2, 0]), offset: [0, -260], rotate: -4, size: 84 },
];

const STYLE: Record<Style, React.CSSProperties> = {
  pink: { color: "#ff4f9a", WebkitTextStroke: "14px #ffffff", fontFamily: FONT_BODY },
  yellow: { color: "#ffd83d", WebkitTextStroke: "14px #3a2200", fontFamily: FONT_BODY },
  cyan: { color: "#3fe0ff", WebkitTextStroke: "14px #08283d", fontFamily: FONT_BODY },
  freeze: { color: "#ffffff", fontFamily: FONT_TITLE },
  boom: { color: "#ffe23d", WebkitTextStroke: "16px #d7263d", fontFamily: FONT_TITLE },
  boomBig: { color: "#ffffff", WebkitTextStroke: "20px #d7263d", fontFamily: FONT_TITLE },
};

const Battery: React.FC = () => (
  <svg width="92" height="46" viewBox="0 0 92 46" style={{ marginRight: 14, filter: "drop-shadow(0 3px 0 rgba(0,0,0,0.4))" }}>
    <rect x="3" y="3" width="76" height="40" rx="8" fill="#ffffff" stroke="#08283d" strokeWidth="6" />
    <rect x="80" y="14" width="9" height="18" rx="3" fill="#08283d" />
    <rect x="11" y="11" width="9" height="24" rx="3" fill="#ff3b3b" />
  </svg>
);

const CueView: React.FC<{ cue: Cue; real: number; cam: Cam }> = ({ cue, real, cam }) => {
  const { width, height, fps } = useVideoConfig();
  const f = (real - cue.start) * fps;
  const dur = (cue.end - cue.start) * fps;
  const isBoom = cue.style === "boom" || cue.style === "boomBig";
  let x = (cue.screen?.[0] ?? 0.5) * width;
  let y = (cue.screen?.[1] ?? 0.3) * height;
  if (cue.anchor) {
    const p = project(cue.anchor(worldTime(real)), cam, width, height);
    x = p.x;
    y = p.y;
  }
  x += cue.offset?.[0] ?? 0;
  y += cue.offset?.[1] ?? 0;
  const size = cue.size ?? 70;
  // keep inside the safe area
  const halfW = (cue.text.length * size * 0.5) / 2 + (cue.battery ? 60 : 0);
  x = clamp(x, 100 + halfW, width - 100 - halfW);
  y = clamp(y, 110 + size / 2, height - 220);

  const pop = interpolate(f, [0, isBoom ? 5 : 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });
  const out = interpolate(f, [dur - 5, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = isBoom ? noise1(real * 25, size) * 6 * (1 - clamp(f / 12)) : 0;
  const wobble = cue.style === "freeze" ? 0 : Math.sin(real * 5 + size) * 1.5;

  const common: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    translate: "-50% -50%",
    rotate: `${(cue.rotate ?? 0) + wobble + shake}deg`,
    scale: `${pop}`,
    opacity: out,
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
  };

  if (cue.style === "freeze") {
    return (
      <div
        style={{
          ...common,
          padding: "18px 46px 22px",
          borderRadius: 26,
          backgroundColor: "rgba(15, 15, 18, 0.88)",
          border: "6px solid #ffffff",
          boxShadow: "0 12px 0 rgba(0,0,0,0.35)",
          fontSize: size,
          ...STYLE.freeze,
        }}
      >
        {cue.text}
      </div>
    );
  }
  return (
    <div style={{ ...common, fontSize: size, filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.38))" }}>
      {cue.battery && <Battery />}
      <span style={{ ...STYLE[cue.style], paintOrder: "stroke fill", letterSpacing: isBoom ? 2 : 0 }}>{cue.text}</span>
    </div>
  );
};

export const VarietyCaptions: React.FC<{ real: number; cam: Cam }> = ({ real, cam }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {CUES.filter((c) => real >= c.start && real < c.end).map((c) => (
      <CueView key={c.text + c.start} cue={c} real={real} cam={cam} />
    ))}
  </AbsoluteFill>
);
