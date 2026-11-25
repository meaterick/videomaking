import dialogue from "../scripts/dialogue.json";
import voice from "./data/voice.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_SEC = 62;
export const DURATION_FRAMES = Math.round(DURATION_SEC * FPS);

// ---------------------------------------------------------------------------
// Real time (what the viewer experiences) vs. world time (what the 3D world
// experiences). They differ only during the freeze-frame gag at the slip.
// ---------------------------------------------------------------------------
export const FREEZE_START = 24.6;
export const FREEZE_LEN = 1.3;
export const worldTime = (real: number) =>
  real < FREEZE_START ? real : real < FREEZE_START + FREEZE_LEN ? FREEZE_START : real - FREEZE_LEN;
export const realTime = (world: number) => (world <= FREEZE_START ? world : world + FREEZE_LEN);
export const isFrozen = (real: number) => real >= FREEZE_START && real < FREEZE_START + FREEZE_LEN;

// ---------------------------------------------------------------------------
// Shot list (real seconds). Camera setups live in camera/shots.ts.
// ---------------------------------------------------------------------------
export type ShotId =
  | "establish"
  | "climb"
  | "summit"
  | "selfie"
  | "boot"
  | "slip"
  | "rollSide"
  | "rollFront"
  | "squirrel"
  | "launch"
  | "landing"
  | "phone"
  | "ending";

export const SHOTS: { id: ShotId; start: number; end: number }[] = [
  { id: "establish", start: 0, end: 5.6 },
  { id: "climb", start: 5.6, end: 11.2 },
  { id: "summit", start: 11.2, end: 17.8 },
  { id: "selfie", start: 17.8, end: 21.4 },
  { id: "boot", start: 21.4, end: 23.0 },
  { id: "slip", start: 23.0, end: 26.8 },
  { id: "rollSide", start: 26.8, end: 30.4 },
  { id: "rollFront", start: 30.4, end: 33.6 },
  { id: "squirrel", start: 33.6, end: 37.2 },
  { id: "launch", start: 37.2, end: 41.2 },
  { id: "landing", start: 41.2, end: 49.6 },
  { id: "phone", start: 49.6, end: 55.0 },
  { id: "ending", start: 55.0, end: DURATION_SEC },
];

export const shotAt = (real: number) =>
  SHOTS.find((s) => real >= s.start && real < s.end) ?? SHOTS[SHOTS.length - 1];

// ---------------------------------------------------------------------------
// Dialogue (single source of truth: scripts/dialogue.json + generated voice.json)
// ---------------------------------------------------------------------------
export type SpeakerId = "hiker" | "narrator";
export type Word = { text: string; startMs: number; endMs: number };
export type Line = {
  id: string;
  speaker: SpeakerId;
  text: string;
  start: number; // real seconds
  duration: number;
  mouth: number[];
  words: Word[];
};

type VoiceData = {
  fps: number;
  lines: Record<string, { duration: number; mouth: number[]; words: Word[] }>;
};
const voiceData = voice as VoiceData;

export const SPEAKERS = dialogue.speakers as Record<SpeakerId, { name: string; color: string }>;

export const LINES: Line[] = dialogue.lines.map((l) => {
  const v = voiceData.lines[l.id];
  if (!v) throw new Error(`Missing generated voice for line ${l.id}. Run scripts/gen_voice.py`);
  return {
    id: l.id,
    speaker: l.speaker as SpeakerId,
    text: l.text,
    start: l.start,
    duration: v.duration,
    mouth: v.mouth,
    words: v.words,
  };
});

/** Lip-sync openness (0..1) of the hiker at a real time. */
export const hikerMouth = (real: number): number => {
  for (const l of LINES) {
    if (l.speaker !== "hiker") continue;
    const local = real - l.start;
    if (local < 0 || local >= l.duration) continue;
    const i = Math.floor(local * FPS);
    return l.mouth[Math.min(i, l.mouth.length - 1)] ?? 0;
  }
  return 0;
};
export const hikerSpeaking = (real: number) =>
  LINES.some((l) => l.speaker === "hiker" && real >= l.start && real < l.start + l.duration);

// ---------------------------------------------------------------------------
// Key world-time events (used by animation, SFX and captions)
// ---------------------------------------------------------------------------
export const EV = {
  climbEnd: 11.6, // steps onto the summit plateau
  plantPoles: 12.4,
  phoneOut: 15.3,
  backSteps: [18.6, 19.6, 20.6] as number[],
  pineStep: 21.8, // the fateful step (foot lands at +0.8s)
  pineSlipStart: 23.2,
  feetUp: 24.2,
  slipImpact: 25.15,
  rollStart: 25.9,
  landPile: 39.3,
  popOut: 42.1,
  phoneBonk: 48.8,
  phoneCatch: 49.2,
  thumbsUp: 51.45, // right after the phone-screen insert
};
