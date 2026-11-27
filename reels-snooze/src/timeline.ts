import dialogue from "../scripts/dialogue.json";
import voice from "./data/voice.json";

// Instagram Reels: 9:16, 30 fps, 24 s (loops back to the opening ringtone).
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SEC = 24;
export const DURATION_FRAMES = DURATION_SEC * FPS;

// Music grid: 150 BPM -> beat 0.4 s, bar 1.6 s. Every cut sits on the grid.
export const BEAT = 0.4;
export const BAR = 1.6;

export type ShotId =
  | "phoneHook"
  | "topSlap"
  | "topPillow"
  | "sideDive"
  | "wideClock"
  | "headRooster"
  | "faceBubble"
  | "phoneLate"
  | "topJump"
  | "run"
  | "phonePov"
  | "faceDoor"
  | "topBack"
  | "phoneEnd"
  | "faceEnd";

export const SHOTS: { id: ShotId; start: number; end: number }[] = [
  { id: "phoneHook", start: 0, end: 1.6 },
  { id: "topSlap", start: 1.6, end: 3.2 },
  { id: "topPillow", start: 3.2, end: 4.8 },
  { id: "sideDive", start: 4.8, end: 6.4 },
  { id: "wideClock", start: 6.4, end: 8.0 },
  { id: "headRooster", start: 8.0, end: 9.6 },
  { id: "faceBubble", start: 9.6, end: 12.0 },
  { id: "phoneLate", start: 12.0, end: 12.8 },
  { id: "topJump", start: 12.8, end: 13.4 },
  { id: "run", start: 13.4, end: 16.0 },
  { id: "phonePov", start: 16.0, end: 16.9 },
  { id: "faceDoor", start: 16.9, end: 18.4 },
  { id: "topBack", start: 18.4, end: 22.4 },
  { id: "phoneEnd", start: 22.4, end: 23.3 },
  { id: "faceEnd", start: 23.3, end: DURATION_SEC },
];
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];

/** Story events (seconds). */
export const EV = {
  slap: 1.72,
  clockRing: 3.2,
  pillowUp: 3.3,
  phoneRing2: 4.8,
  dive: 4.95,
  giantDrop: 6.4,
  giantLand: 6.78,
  roosterLand: 8.3,
  signUp: 8.9,
  chaos: 9.6,
  roosterCrow2: 9.75,
  bubblePop: 11.4,
  eyesOpen: 11.62,
  late: 12.0,
  jump: 12.85,
  poof: 13.45,
  dashStart: 13.75,
  skid: 15.55,
  phoneOut: 15.85,
  saturday: 16.0,
  toastDrop: 17.25,
  flop: 18.6,
  endRing: 22.4,
  despair: 23.35,
};

/** Clock time shown on screens at a given story second. */
export const storyClock = (t: number): string => {
  if (t < EV.clockRing) return "7:00";
  if (t < EV.phoneRing2) return "7:05";
  if (t < EV.giantDrop) return "7:10";
  if (t < 8.0) return "7:15";
  if (t < EV.chaos) return "7:20";
  if (t < EV.late) return "7:25";
  if (t < EV.endRing) return "8:57";
  return "9:00";
};

// ---------------------------------------------------------------- dialogue
export type SpeakerId = "guy" | "rooster";
export type Word = { text: string; startMs: number; endMs: number };
export type Line = {
  id: string;
  speaker: SpeakerId;
  text: string;
  start: number;
  duration: number;
  mouth: number[];
  words: Word[];
  caption: boolean;
};
type VoiceData = { lines: Record<string, { duration: number; mouth: number[]; words: Word[] }> };
const voiceData = voice as VoiceData;

export const SPEAKERS = dialogue.speakers as Record<SpeakerId, { name: string; color: string }>;
export const LINES: Line[] = dialogue.lines.map((l) => {
  const v = voiceData.lines[l.id];
  if (!v) throw new Error(`Missing voice for ${l.id}. Run scripts/gen_voice.py`);
  return {
    id: l.id,
    speaker: l.speaker as SpeakerId,
    text: l.text,
    start: l.start,
    duration: v.duration,
    mouth: v.mouth,
    words: v.words,
    caption: (l as { caption?: boolean }).caption !== false,
  };
});

const mouthOf = (speaker: SpeakerId) => (t: number) => {
  for (const l of LINES) {
    if (l.speaker !== speaker) continue;
    const local = t - l.start;
    if (local < 0 || local >= l.duration) continue;
    return l.mouth[Math.min(Math.floor(local * FPS), l.mouth.length - 1)] ?? 0;
  }
  return 0;
};
export const guyMouth = mouthOf("guy");
export const roosterMouth = mouthOf("rooster");
export const guySpeaking = (t: number) => LINES.some((l) => l.speaker === "guy" && t >= l.start && t < l.start + l.duration);
