import { clamp, fbm2, lerp, noise2, smoothstep } from "../lib/anim";

// "데굴산" (Degul-san, Rolling Mountain). Summit at the origin, the hiker's
// tumble line runs straight down the +x slope (z ≈ 0) to the trailhead.
export const SUMMIT_H = 60;
export const PLATEAU_R = 3.3;
export const BASE_R = 132;
const PROFILE_EXP = 1.55;

export const TRAILHEAD_X = 142; // leaf pile
export const GATE_X = 147.5;

// Rock outcrops on the tumble line that make him hop. Asymmetric bumps:
// gentle rise (up), sharp drop-off (down).
export const BUMPS = [
  { x: 30, h: 1.1, up: 2.6, down: 1.0 },
  { x: 52, h: 1.5, up: 3.0, down: 1.1 },
  { x: 74, h: 1.2, up: 2.6, down: 1.0 },
  { x: 96, h: 0.9, up: 2.2, down: 1.0 },
  { x: 118, h: 2.3, up: 5.0, down: 1.3 },
];

const radialProfile = (r: number) => {
  if (r <= PLATEAU_R) return SUMMIT_H + 0.18 * (1 - (r / PLATEAU_R) ** 2);
  const u = clamp((r - PLATEAU_R) / (BASE_R - PLATEAU_R));
  return SUMMIT_H * Math.pow(1 - u, PROFILE_EXP);
};

// soft edge between plateau and slope
const mainMountain = (x: number, z: number) => {
  const r = Math.hypot(x, z);
  const k = 0.35;
  if (Math.abs(r - PLATEAU_R) < k) {
    const a = radialProfile(PLATEAU_R - k);
    const b = radialProfile(PLATEAU_R + k);
    const t = (r - (PLATEAU_R - k)) / (2 * k);
    const s = t * t * (3 - 2 * t);
    return lerp(a, b, s);
  }
  return radialProfile(r);
};

const cone = (x: number, z: number, cx: number, cz: number, h: number, radius: number, exp = 1.7) => {
  const r = Math.hypot(x - cx, z - cz);
  if (r >= radius) return 0;
  return h * Math.pow(1 - r / radius, exp);
};

/** 1 on the tumble corridor (z≈0, x in [0, trailhead]), 0 away from it. */
export const corridorMask = (x: number, z: number) =>
  (1 - smoothstep(4, 10, Math.abs(z))) * smoothstep(-3, 3, x) * (1 - smoothstep(TRAILHEAD_X + 8, TRAILHEAD_X + 22, x));

const trailheadMask = (x: number, z: number) =>
  (1 - smoothstep(14, 26, Math.hypot(x - TRAILHEAD_X - 2, z * 1.2)));

const bumpField = (x: number, z: number) => {
  let h = 0;
  for (const b of BUMPS) {
    const dx = x - b.x;
    const sx = dx < 0 ? b.up : b.down;
    h += b.h * Math.exp(-(dx * dx) / (2 * sx * sx)) * Math.exp(-(z * z) / (2 * 3.2 * 3.2));
  }
  return h;
};

/** Terrain height at world (x, z). */
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const u = clamp((r - PLATEAU_R) / (BASE_R - PLATEAU_R));
  const corr = corridorMask(x, z);
  const th = trailheadMask(x, z);

  let h = mainMountain(x, z);
  // radial ridges & gullies (not on the corridor, not near the summit)
  const theta = Math.atan2(z, x);
  const ridge = (Math.sin(theta * 7 + 0.7) * 0.6 + Math.sin(theta * 13 + 2.1) * 0.4) * Math.sin(Math.PI * u);
  h += ridge * 3.2 * (1 - corr) * smoothstep(0.03, 0.15, u);

  // neighbouring peaks to make a range
  h = Math.max(
    h,
    cone(x, z, -55, -150, 78, 125),
    cone(x, z, 125, -190, 58, 110),
    cone(x, z, -175, 25, 52, 110),
    cone(x, z, 60, 210, 40, 110),
    cone(x, z, 260, -40, 45, 120),
  );

  // ground noise: rough off-trail, gentle on the corridor and trailhead
  const amp = lerp(1.4, 0.18, Math.max(corr, th)) * (r < PLATEAU_R + 1 ? 0.15 : 1);
  h += fbm2(x * 0.045, z * 0.045, 4, 3) * amp * 2.2;
  h += noise2(x * 0.5, z * 0.5, 9) * 0.06;

  h += bumpField(x, z) * smoothstep(0, 1, corr + 0.2);
  // flatten trailhead plaza
  h = lerp(h, 0.05 + noise2(x * 0.2, z * 0.2, 4) * 0.05, th);
  return h;
}

/** Surface normal via central differences. */
export function normalAt(x: number, z: number): [number, number, number] {
  const e = 0.25;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  const nx = -hx / (2 * e);
  const nz = -hz / (2 * e);
  const len = Math.hypot(nx, 1, nz);
  return [nx / len, 1 / len, nz / len];
}

/** Ground colour (autumn palette) for vertex colouring. */
export function groundColor(x: number, z: number, h: number, slope: number): [number, number, number] {
  const n = fbm2(x * 0.06, z * 0.06, 3, 11);
  const n2 = noise2(x * 0.35, z * 0.35, 5);
  // base: olive grass shading into ochre / rust leaf litter
  const grass: [number, number, number] = [0.47, 0.55, 0.22];
  const ochre: [number, number, number] = [0.78, 0.55, 0.2];
  const rust: [number, number, number] = [0.66, 0.3, 0.14];
  const rock: [number, number, number] = [0.55, 0.53, 0.5];
  const dirt: [number, number, number] = [0.6, 0.46, 0.32];
  const t1 = smoothstep(-0.25, 0.35, n);
  let c: [number, number, number] = [
    lerp(grass[0], ochre[0], t1),
    lerp(grass[1], ochre[1], t1),
    lerp(grass[2], ochre[2], t1),
  ];
  const t2 = smoothstep(0.2, 0.7, n2) * 0.6;
  c = [lerp(c[0], rust[0], t2), lerp(c[1], rust[1], t2), lerp(c[2], rust[2], t2)];
  // rocky summit and steep faces
  const rk = Math.max(smoothstep(SUMMIT_H - 4, SUMMIT_H - 0.5, h) * 0.85, smoothstep(0.9, 1.4, slope) * 0.7);
  c = [lerp(c[0], rock[0], rk), lerp(c[1], rock[1], rk), lerp(c[2], rock[2], rk)];
  // packed-dirt trail: final straight to the summit + trailhead plaza
  const trail =
    Math.max(
      (1 - smoothstep(0.7, 1.6, Math.abs(z))) * smoothstep(2, 4, x) * (1 - smoothstep(22, 26, x)),
      (1 - smoothstep(9, 15, Math.hypot(x - TRAILHEAD_X - 3, z))) * 0.9,
      (1 - smoothstep(1.2, 2.2, Math.abs(z + (x - GATE_X) * 0.0))) * smoothstep(GATE_X - 2, GATE_X, x) * 0.9,
    ) * (0.85 + 0.15 * n2);
  c = [lerp(c[0], dirt[0], trail), lerp(c[1], dirt[1], trail), lerp(c[2], dirt[2], trail)];
  // valley floor a bit greener and darker
  const low = 1 - smoothstep(1, 8, h);
  c = [c[0] * (1 - 0.12 * low), c[1] * (1 - 0.02 * low), c[2] * (1 - 0.1 * low)];
  return c;
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------
export const groundY = (x: number, z: number) => heightAt(x, z);

/** Point on the ground offset along its normal (for things lying on slopes). */
export function onGround(x: number, z: number, lift: number): [number, number, number] {
  const n = normalAt(x, z);
  const y = heightAt(x, z);
  return [x + n[0] * lift, y + n[1] * lift, z + n[2] * lift];
}

/** Slope angle (radians) along +x of the tumble line. */
export const slopeAngleX = (x: number) => {
  const e = 0.3;
  return Math.atan2(heightAt(x - e, 0) - heightAt(x + e, 0), 2 * e);
};
