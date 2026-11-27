import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Cam } from "../camera/shots";
import { GIANT, guyFK, guyState, PHONE_ON_BED, popState, roosterState, SMALL_CLOCK } from "../character/performance";
import { FONT_BODY, FONT_SIGN, FONT_TITLE } from "../fonts";
import { add3, clamp, noise1, rng, V3 } from "../lib/anim";
import { BAR, EV, FPS } from "../timeline";
import { project } from "./project";
import { Subtitles } from "./Subtitles";

// Reels safe zone (1080x1920): keep text inside x 80..940 and y 200..1460.
const SAFE = { x0: 80, x1: 940, y0: 520, y1: 1450 };

const pop = (local: number, dur = 0.22) =>
  interpolate(local, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.34, 1.6, 0.64, 1) });

// ---------------------------------------------------------------- title / CTA
const TitleBar: React.FC<{ t: number }> = ({ t }) => {
  const cta = t >= EV.endRing;
  const local = cta ? t - EV.endRing : t;
  const lines = cta ? ["알람 5개 맞추는 친구", "태그 ㄱㄱ 👇"] : ["알람 5개도", "못 이기는 사람 특"];
  const s = cta ? pop(local, 0.25) : t < 0.6 ? interpolate(t, [0, 0.35], [1.4, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.34, 1.5, 0.64, 1) }) : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: 205,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT_TITLE,
        lineHeight: 1.08,
        scale: `${s}`,
        opacity: cta ? 1 : interpolate(t, [0, 0.08], [0, 1], { extrapolateRight: "clamp" }),
        filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.35))",
      }}
    >
      {lines.map((l, i) => (
        <div key={l} style={{ fontSize: i === 0 ? 92 : 84, color: i === 0 ? "#FFE14D" : "#ffffff", WebkitTextStroke: "16px #121212", paintOrder: "stroke fill" }}>
          {l}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- alarm counter
const BADGES: { start: number; text: string }[] = [
  { start: 1.6, text: "⏰ 07:00 · 알람 1/5" },
  { start: 3.2, text: "⏰ 07:05 · 알람 2/5" },
  { start: 4.8, text: "⏰ 07:10 · 알람 3/5" },
  { start: 6.4, text: "⏰ 07:15 · 알람 4/5" },
  { start: 8.0, text: "⏰ 07:20 · 알람 5/5" },
  { start: 9.6, text: "🚨 07:25 · 알람 총공격" },
];
const AlarmBadge: React.FC<{ t: number }> = ({ t }) => {
  if (t < 1.6 || t >= EV.bubblePop) return null;
  const b = [...BADGES].reverse().find((x) => t >= x.start)!;
  const local = t - b.start;
  const chaos = t >= EV.chaos;
  return (
    <div style={{ position: "absolute", top: 428, width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          padding: "10px 30px 14px",
          borderRadius: 40,
          background: chaos ? "#ff2d55" : "#e5383b",
          color: "#fff",
          fontFamily: FONT_SIGN,
          fontSize: 54,
          boxShadow: "0 6px 0 rgba(0,0,0,0.3)",
          scale: `${0.7 + 0.3 * pop(local, 0.2)}`,
          rotate: `${chaos ? noise1(t * 30, 3) * 4 : 0}deg`,
          translate: chaos ? `${noise1(t * 40, 1) * 8}px 0px` : undefined,
        }}
      >
        {b.text}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- onomatopoeia & variety captions
type Style = "boom" | "boomBig" | "pink" | "cyan" | "box" | "stamp";
type Cue = { text: string; start: number; end: number; style: Style; at?: (t: number) => V3; screen?: [number, number]; off?: [number, number]; rot?: number; size?: number };

const head = (dy = 0) => (t: number) => {
  const h = guyFK(t).head;
  return [h.x, h.y + dy, h.z] as V3;
};

const CUES: Cue[] = [
  { text: "지잉~ 지잉~", start: 0.15, end: 1.6, style: "boom", screen: [0.5, 0.57], rot: -6, size: 88 },
  { text: "찰싹!", start: EV.slap, end: EV.slap + 0.5, style: "boomBig", at: () => PHONE_ON_BED.pos, off: [60, -120], rot: 10, size: 140 },
  { text: "따르릉!!", start: EV.clockRing, end: 4.7, style: "boom", at: () => add3(SMALL_CLOCK.pos, [0, 0.2, 0]), off: [-60, -110], rot: -8, size: 104 },
  { text: "징~ 징~", start: 4.8, end: 5.3, style: "boom", at: () => PHONE_ON_BED.pos, off: [0, -120], rot: 6, size: 90 },
  { text: "(이불 속으로 도주)", start: 5.05, end: 6.35, style: "pink", screen: [0.5, 0.52], rot: -3, size: 78 },
  { text: "쿵!!!", start: EV.giantLand, end: EV.giantLand + 0.75, style: "boomBig", at: () => add3(GIANT.pos, [0, 1.9, 0]), off: [140, -40], rot: -10, size: 210 },
  { text: "드르렁~ 쿨~", start: 7.15, end: 8.0, style: "cyan", screen: [0.62, 0.55], rot: 7, size: 84 },
  { text: "꼬끼오!!", start: 8.35, end: 9.0, style: "boom", at: (t) => add3(roosterState(t).pos, [0, 0.55, 0]), off: [40, -40], rot: -8, size: 112 },
  { text: "(대화 거부)", start: 9.0, end: 9.6, style: "pink", screen: [0.42, 0.56], rot: 4, size: 80 },
  { text: "(평온)", start: 10.15, end: 11.35, style: "pink", screen: [0.26, 0.47], rot: -6, size: 84 },
  { text: "뽁!", start: EV.bubblePop, end: EV.bubblePop + 0.45, style: "boomBig", at: (t) => popState(t).center, off: [0, -60], rot: 8, size: 170 },
  { text: "지각 확정", start: 13.6, end: 15.5, style: "stamp", screen: [0.5, 0.57], rot: -12, size: 104 },
  { text: "끼익!", start: EV.skid, end: EV.skid + 0.45, style: "boom", at: (t) => {
    const p = guyState(t).pos;
    return [p[0], 0.1, p[2]] as V3;
  }, off: [-80, -40], rot: -10, size: 110 },
  { text: "(토요일이었다)", start: 16.95, end: 18.4, style: "box", screen: [0.5, 0.53], size: 84 },
  { text: "다시 꿀잠 😴", start: 19.8, end: 22.25, style: "pink", screen: [0.5, 0.54], rot: -3, size: 86 },
  { text: "(주말 알람도 맞춰놓음)", start: EV.despair + 0.05, end: 24.0, style: "box", screen: [0.5, 0.56], size: 64 },
];

const STYLE: Record<Style, React.CSSProperties> = {
  boom: { color: "#FFE14D", WebkitTextStroke: "16px #d7263d", fontFamily: FONT_TITLE },
  boomBig: { color: "#ffffff", WebkitTextStroke: "20px #d7263d", fontFamily: FONT_TITLE },
  pink: { color: "#ff4f9a", WebkitTextStroke: "14px #ffffff", fontFamily: FONT_BODY },
  cyan: { color: "#3fe0ff", WebkitTextStroke: "14px #08283d", fontFamily: FONT_BODY },
  box: { color: "#ffffff", fontFamily: FONT_TITLE },
  stamp: { color: "#e5383b", fontFamily: FONT_TITLE },
};

const CueView: React.FC<{ cue: Cue; t: number; cam: Cam }> = ({ cue, t, cam }) => {
  const { width, height } = useVideoConfig();
  const local = t - cue.start;
  const dur = cue.end - cue.start;
  let x = (cue.screen?.[0] ?? 0.5) * width;
  let y = (cue.screen?.[1] ?? 0.5) * height;
  if (cue.at) {
    const p = project(cue.at(t), cam, width, height);
    x = p.x;
    y = p.y;
  }
  x += cue.off?.[0] ?? 0;
  y += cue.off?.[1] ?? 0;
  const size = cue.size ?? 80;
  const halfW = Math.min(420, (cue.text.length * size * 0.52) / 2);
  x = clamp(x, SAFE.x0 + halfW, SAFE.x1 - halfW);
  y = clamp(y, SAFE.y0 + size / 2, SAFE.y1 - size / 2);
  const isBoom = cue.style === "boom" || cue.style === "boomBig";
  const s = cue.style === "stamp" ? interpolate(local, [0, 0.12], [2.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : pop(local, isBoom ? 0.16 : 0.24);
  const fade = interpolate(local, [dur - 0.12, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = isBoom ? noise1(t * 28, size) * 6 * (1 - clamp(local / 0.4)) : 0;
  const common: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    translate: "-50% -50%",
    scale: `${s}`,
    rotate: `${(cue.rot ?? 0) + shake}deg`,
    opacity: fade,
    whiteSpace: "nowrap",
    fontSize: size,
  };
  if (cue.style === "box") {
    return (
      <div style={{ ...common, ...STYLE.box, padding: "14px 36px 18px", borderRadius: 24, background: "rgba(14,14,18,0.86)", border: "5px solid #fff", boxShadow: "0 10px 0 rgba(0,0,0,0.3)" }}>
        {cue.text}
      </div>
    );
  }
  if (cue.style === "stamp") {
    return (
      <div style={{ ...common, ...STYLE.stamp, padding: "6px 30px 10px", border: "12px solid #e5383b", borderRadius: 18, background: "rgba(255,255,255,0.75)", letterSpacing: 6 }}>
        {cue.text}
      </div>
    );
  }
  return (
    <div style={{ ...common, filter: "drop-shadow(0 7px 0 rgba(0,0,0,0.35))" }}>
      <span style={{ ...STYLE[cue.style], paintOrder: "stroke fill" }}>{cue.text}</span>
    </div>
  );
};

// ---------------------------------------------------------------- Zzz
const Zzz: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const { width, height } = useVideoConfig();
  const windows = [
    [7.0, 8.0],
    [21.0, 22.4],
  ];
  const w = windows.find(([a, b]) => t >= a && t < b);
  if (!w) return null;
  const anchor = project(head(0.3)(t), cam, width, height);
  return (
    <>
      {[0, 1, 2].map((i) => {
        const phase = ((t - w[0]) * 0.9 + i / 3) % 1;
        const size = 90 - i * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: clamp(anchor.x + 60 + phase * 160, 120, 900),
              top: clamp(anchor.y - 80 - phase * 260, 560, 1400),
              fontFamily: FONT_TITLE,
              fontSize: size,
              color: "#ffffff",
              WebkitTextStroke: "10px #2b3a67",
              paintOrder: "stroke fill",
              opacity: Math.sin(phase * Math.PI),
              rotate: `${-12 + phase * 20}deg`,
            }}
          >
            {i === 0 ? "Z" : "z"}
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- full-frame effects
const SpeedLines: React.FC<{ t: number }> = ({ t }) => {
  const { width, height } = useVideoConfig();
  if (t < EV.dashStart || t >= EV.skid) return null;
  const frame = Math.floor(t * FPS);
  const rand = rng(frame * 7 + 1);
  const cx = width / 2;
  const cy = height * 0.5;
  const lines = Array.from({ length: 34 }, () => {
    const a = rand() * Math.PI * 2;
    const r0 = 420 + rand() * 260;
    const r1 = r0 + 260 + rand() * 520;
    return { x0: cx + Math.cos(a) * r0, y0: cy + Math.sin(a) * r0, x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1, w: 3 + rand() * 7 };
  });
  return (
    <svg width={width} height={height} style={{ position: "absolute", opacity: 0.75 }}>
      {lines.map((l, i) => (
        <line key={i} x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1} stroke="#ffffff" strokeWidth={l.w} strokeLinecap="round" />
      ))}
    </svg>
  );
};

export const Overlays: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const flash = Math.max(
    interpolate(t, [EV.bubblePop, EV.bubblePop + 0.03, EV.bubblePop + 0.18], [0, 0.65, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(t, [EV.poof, EV.poof + 0.03, EV.poof + 0.2], [0, 0.45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const alarmRed = t >= EV.late && t < 12.8 ? 0.55 + 0.45 * Math.sin((t - EV.late) * Math.PI * 2 * 2.5) : 0;
  const barPulse = t >= 1.6 && t < EV.bubblePop ? Math.exp(-((t - 1.6) % BAR) * 9) * 0.08 : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* soft vignette, pulsing slightly on each bar while the alarms escalate */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${0.3 + barPulse}) 100%)` }} />
      {alarmRed > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(255,0,40,0) 45%, rgba(255,0,40,${0.45 * alarmRed}) 100%)` }} />}
      <SpeedLines t={t} />
      <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: flash }} />
      <Zzz t={t} cam={cam} />
      {CUES.filter((c) => t >= c.start && t < c.end).map((c) => (
        <CueView key={c.text + c.start} cue={c} t={t} cam={cam} />
      ))}
      <AlarmBadge t={t} />
      <TitleBar t={t} />
      <Subtitles />
    </AbsoluteFill>
  );
};
