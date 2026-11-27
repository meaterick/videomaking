export type EyeStyle = "normal" | "happy" | "squeeze" | "dizzy" | "sleep";
export type MouthShape = "smile" | "grin" | "o" | "flat" | "pant" | "scream" | "wavy";

export type Face = {
  eyeL: number; // openness, 1 = normal, >1 = wide
  eyeR: number;
  eyeStyle: EyeStyle;
  pupil: number; // pupil scale
  look: [number, number]; // pupil offset (-1..1)
  brow: number; // -1 frown .. 0 neutral .. 1 raised
  browTilt: number; // + = worried (inner ends up)
  mouth: MouthShape;
  open: number; // jaw open 0..1 (lip sync adds here)
  blush: number;
  sweat: number;
};

export const NEUTRAL: Face = {
  eyeL: 1,
  eyeR: 1,
  eyeStyle: "normal",
  pupil: 1,
  look: [0, 0],
  brow: 0,
  browTilt: 0,
  mouth: "smile",
  open: 0,
  blush: 0,
  sweat: 0,
};

export const face = (over: Partial<Face>): Face => ({ ...NEUTRAL, ...over });

/** Periodic blink multiplier (0 = closed). */
export const blink = (t: number, offset = 0) => {
  const period = 3.3;
  const p = (((t + offset) % period) + period) % period;
  if (p < 0.07) return 1 - p / 0.07;
  if (p < 0.14) return (p - 0.07) / 0.07;
  return 1;
};
