import * as THREE from "three";
import { clamp, easeIn, easeInOut, easeOut, easeOutBack, invLerp, kf, lerp, lerp3, smoothstep, V3, windowW } from "../lib/anim";
import { EV, guyMouth, guySpeaking, roosterMouth, storyClock } from "../timeline";
import { NIGHTSTAND } from "../world/Room";
import { DuvetMode, Screen } from "../world/Props";
import { blink, face, Face } from "./face";
import { aL, aR, blend, bodyPoints, forwardKinematics, lL, lR, Pose, pose } from "./rig";

// ---------------------------------------------------------------------------
// Orientation helpers
// ---------------------------------------------------------------------------
const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const qAxis = (axis: THREE.Vector3, a: number) => new THREE.Quaternion().setFromAxisAngle(axis, a);
/** Lying on the back, head towards -z; roll = rotation about the body's long axis. */
const lyingQuat = (roll = 0) => qAxis(AZ, roll).multiply(qAxis(AX, -Math.PI / 2));
const standingQuat = (yaw: number) => qAxis(AY, yaw);

export const BED_ROOT: V3 = [0, 0.83, -1.08];

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------
const SLEEP = pose({ neck: [0.15, 0, 0], armL: aL(-0.25, 0.22), elbowL: 0.2, armR: aR(-0.25, 0.22), elbowR: 0.2, legL: lL(0, 0.06), legR: lR(0, 0.06) });
const SLAP = { ...SLEEP, armL: aL(3.4, 0.5, -0.6), elbowL: 0.45, handL: "open" as const };
const PILLOW_FACE = { ...SLEEP, neck: [-0.15, 0, 0] as V3, armL: aL(2.3, -0.1, 0.6), elbowL: 0.05, armR: aR(2.3, -0.1, 0.6), elbowR: 0.05, handL: "grip" as const, handR: "grip" as const };
const PULL = { ...SLEEP, armL: aL(0.9, -0.4), elbowL: 1.8, armR: aR(0.9, -0.4), elbowR: 1.8, handL: "fist" as const, handR: "fist" as const };
const CURL = pose({ neck: [0.35, 0, 0], spine: [0.25, 0, 0], armL: aL(0.35, -0.35), elbowL: 1.7, armR: aR(0.35, -0.35), elbowR: 1.7, legL: lL(0.75, 0.12), kneeL: 1.35, legR: lR(0.7, 0.08), kneeR: 1.3, handL: "fist", handR: "fist" });
const COZY = pose({ neck: [0.1, 0, 0], armL: aL(0.2, 0.05, 0.3), elbowL: 1.45, armR: aR(0.2, 0.05, 0.3), elbowR: 1.45, legL: lL(0, 0.06), legR: lR(0, 0.06) });
const STAR = pose({ neck: [-0.1, 0, 0], armL: aL(0.2, 1.3), elbowL: 0.3, armR: aR(0.2, 1.3), elbowR: 0.3, legL: lL(0.1, 0.45), legR: lR(0.1, 0.45), handL: "open", handR: "open" });

function runPose(phase: number, amp = 1): Pose {
  const s = Math.sin(phase) * amp;
  const c = Math.cos(phase) * amp;
  return pose({
    lean: [0.32, 0, 0],
    spine: [0.12, 0.12 * s, 0],
    neck: [-0.3, 0, 0],
    legL: lL(1.0 * s, 0.05),
    kneeL: 0.4 + 1.3 * Math.max(0, -c),
    footL: -0.2,
    legR: lR(-1.0 * s, 0.05),
    kneeR: 0.4 + 1.3 * Math.max(0, c),
    footR: -0.2,
    armL: aL(-0.9 * s, 0.25),
    elbowL: 1.5,
    armR: aR(0.9 * s, 0.25),
    elbowR: 1.5,
    handL: "fist",
    handR: "fist",
  });
}
const SKID = pose({
  lean: [-0.4, 0, 0],
  spine: [-0.1, 0, 0],
  neck: [0.15, 0, 0],
  legL: lL(0.7, 0.15),
  kneeL: 0.2,
  footL: -0.4,
  legR: lR(0.35, 0.15),
  kneeR: 0.5,
  armL: aL(0.4, 1.2),
  elbowL: 0.4,
  armR: aR(0.4, 1.2),
  elbowR: 0.4,
  handL: "open",
  handR: "open",
});
const CHECK_PHONE = pose({ neck: [0.32, 0, 0], armR: aR(1.15, 0.12, 0.4), elbowR: 1.5, wristR: [0.5, 0, 0], armL: aL(0.05, 0.25), elbowL: 0.3, handR: "grip" });
const STUNNED = pose({ neck: [0.05, 0, 0], armR: aR(0.45, 0.2, 0.3), elbowR: 0.9, armL: aL(0.05, 0.35), elbowL: 0.2, handR: "grip", handL: "open" });

// ---------------------------------------------------------------------------
// The guy
// ---------------------------------------------------------------------------
export type GuyState = {
  pos: V3;
  quat: THREE.Quaternion;
  pose: Pose;
  face: Face;
  snot: number;
  dressed: boolean;
  tieFlap: number;
  toast: boolean;
  visible: boolean;
};

const RUN_PATH: [number, V3][] = [
  [EV.dashStart, [1.05, 0.98, -0.6]],
  [14.6, [1.45, 0.98, 0.35]],
  [EV.skid, [2.05, 0.98, 1.12]],
  [EV.skid + 0.3, [2.18, 0.98, 1.2]],
];

export function guyState(t: number): GuyState {
  const talking = guySpeaking(t);
  const mouth = guyMouth(t);
  const bl = blink(t);
  const sleepy = face({ eyeStyle: "sleep", mouth: talking ? "flat" : "o", open: talking ? mouth : 0.12 + 0.05 * Math.sin(t * 2.2), brow: -0.1, browTilt: 0.2 });
  const base: GuyState = { pos: BED_ROOT, quat: lyingQuat(), pose: SLEEP, face: sleepy, snot: 0, dressed: false, tieFlap: 0, toast: false, visible: true };
  const breath = Math.sin(t * Math.PI * 2 * 0.35) * 0.012;

  // ---- bars 1-3: slap, pillow
  if (t < EV.dive) {
    let p = SLEEP;
    if (t < 2.4) p = blend(SLEEP, SLAP, windowW(t, EV.slap - 0.12, 2.35, 0.12, 0.3));
    if (t >= EV.pillowUp) p = blend(SLEEP, PILLOW_FACE, windowW(t, EV.pillowUp, EV.dive + 0.1, 0.25, 0.15));
    const grumpy = face({ ...sleepy, mouth: talking ? "flat" : "wavy", brow: -0.4, browTilt: 0.6 });
    return { ...base, pos: [BED_ROOT[0], BED_ROOT[1] + breath, BED_ROOT[2]], pose: p, face: t > EV.clockRing ? grumpy : sleepy };
  }
  // ---- bars 4-6: under the duvet (curled up)
  if (t < EV.chaos) {
    const curl = smoothstep(EV.dive, EV.dive + 0.35, t);
    let p = blend(blend(SLEEP, PULL, windowW(t, EV.dive - 0.05, EV.dive + 0.45, 0.15, 0.2)), CURL, curl);
    const mutter = windowW(t, 5.3, 6.7, 0.05) * Math.sin(t * 30) * 0.01;
    const snoreBreath = Math.sin(t * Math.PI * 2 * 0.62) * 0.025;
    // the bed jumps when the giant clock lands
    const jolt = t > EV.giantLand ? Math.exp(-(t - EV.giantLand) * 7) * Math.sin((t - EV.giantLand) * 40) * 0.08 : 0;
    p = { ...p, spine: [p.spine[0] + snoreBreath, 0, 0] };
    return { ...base, pos: [BED_ROOT[0] + mutter, BED_ROOT[1] + jolt + snoreBreath * 0.5, BED_ROOT[2] + 0.12 * curl], pose: p };
  }
  // ---- bar 7: peaceful snot bubble in total chaos, then eyes snap open
  if (t < EV.jump) {
    const grow = smoothstep(9.75, 11.35, t);
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.9);
    const snot = t < EV.bubblePop ? grow * (0.55 + 0.45 * pulse) : 0;
    const shake = t < EV.bubblePop ? Math.sin(t * 47) * 0.006 : 0;
    let f: Face = face({ eyeStyle: "sleep", mouth: "smile", open: 0, blush: 0.35 });
    if (t >= EV.eyesOpen) f = face({ eyeL: 1.35, eyeR: 1.35, pupil: 0.55, brow: 1, browTilt: 0.2, mouth: talking ? "o" : "flat", open: talking ? mouth : 0, look: [0.4, 0] });
    return { ...base, pos: [BED_ROOT[0] + shake, BED_ROOT[1], BED_ROOT[2]], pose: COZY, face: f, snot };
  }
  // ---- launch out of bed
  if (t < EV.poof) {
    const u = invLerp(EV.jump, EV.jump + 0.5, t);
    const pos = lerp3(BED_ROOT, [0.9, 2.3, -0.75], easeOut(u));
    const q = new THREE.Quaternion().slerpQuaternions(lyingQuat(), standingQuat(Math.PI * 0.25), easeInOut(u));
    const f = face({ eyeL: 1.35, eyeR: 1.35, pupil: 0.5, brow: 1, mouth: "scream", open: 0.6 });
    return { ...base, pos, quat: q, pose: blend(STAR, runPose(t * 30), u), face: f };
  }
  // ---- dressed in a poof, wind-up, dash, skid
  const panicFace = face({ eyeL: 1.3, eyeR: 1.3, pupil: 0.6, brow: 1, browTilt: 0.5, mouth: talking ? "o" : "flat", open: talking ? mouth : 0.1, sweat: 1 });
  if (t < EV.phoneOut) {
    let pos: V3;
    let yaw: number;
    let p: Pose;
    if (t < EV.dashStart) {
      pos = RUN_PATH[0][1];
      yaw = 0.35;
      p = runPose(t * 55, 1); // cartoon wheel-legs wind-up
    } else if (t < EV.skid) {
      const u = invLerp(EV.dashStart, EV.skid, t);
      pos = lerp3(lerp3(RUN_PATH[0][1], RUN_PATH[1][1], clamp(u * 2)), lerp3(RUN_PATH[1][1], RUN_PATH[2][1], clamp(u * 2 - 1)), smoothstep(0.35, 0.65, u));
      yaw = lerp(0.35, 0.75, u);
      p = runPose(t * 28, 1);
    } else {
      const u = invLerp(EV.skid, EV.phoneOut, t);
      pos = lerp3(RUN_PATH[2][1], RUN_PATH[3][1], easeOut(u));
      yaw = 0.75;
      p = blend(runPose(t * 28), SKID, smoothstep(0, 0.4, u));
    }
    const bob = Math.abs(Math.sin(t * 28)) * 0.05 * (t < EV.skid ? 1 : 0);
    return {
      ...base,
      pos: [pos[0], pos[1] + bob, pos[2]],
      quat: standingQuat(yaw),
      pose: p,
      face: panicFace,
      dressed: true,
      tieFlap: 0.9 + 0.25 * Math.sin(t * 31),
      toast: true,
    };
  }
  // ---- at the door: check the phone, turn, stunned
  if (t < 18.4) {
    const turn = kf(t, [[16.85, 0.75], [17.15, -Math.PI / 2 - 0.25]], easeInOut);
    const p = blend(CHECK_PHONE, STUNNED, smoothstep(16.85, 17.1, t));
    const f = face({
      eyeL: (t > 17.6 ? bl : 1) * 1.2,
      eyeR: (t > 17.6 ? bl : 1) * 1.2,
      pupil: 0.65,
      brow: 0.9,
      browTilt: 0.1,
      mouth: talking ? "o" : "flat",
      open: talking ? mouth : t > EV.toastDrop ? 0.35 : 0.05,
      look: t < 16.9 ? [0, -0.8] : [0, 0],
    });
    return { ...base, pos: RUN_PATH[3][1], quat: standingQuat(turn), pose: p, face: f, dressed: true, toast: t < EV.toastDrop };
  }
  // ---- flop back into bed, blissful weekend
  const fall = clamp((t - 18.4) / 0.22);
  const pos: V3 = [BED_ROOT[0], lerp(2.6, BED_ROOT[1], easeIn(fall)) + (fall >= 1 ? Math.exp(-(t - 18.62) * 9) * Math.sin((t - 18.62) * 30) * 0.06 : 0), BED_ROOT[2]];
  const wiggle = windowW(t, 18.8, 20.8, 0.2) * Math.sin(t * Math.PI * 2 * 1.6) * 0.13;
  const p = blend(STAR, COZY, smoothstep(18.55, 18.85, t));
  let f: Face = face({ eyeStyle: talking ? "normal" : "happy", eyeL: bl, eyeR: bl, mouth: "grin", open: talking ? mouth : 0, blush: 0.6 });
  if (t > 21.0) f = face({ eyeStyle: "sleep", mouth: "smile", open: 0, blush: 0.4 });
  if (t >= EV.despair) f = face({ eyeL: 1.4, eyeR: 1.4, pupil: 0.5, brow: 0.6, browTilt: 1, mouth: "wavy", open: 0.25, sweat: 1, look: [0.6, 0] });
  return { ...base, pos, quat: lyingQuat(wiggle), pose: p, face: f, dressed: true };
}

export const guyFK = (t: number) => {
  const s = guyState(t);
  return forwardKinematics(s.pos, s.quat, s.pose);
};

// ---------------------------------------------------------------------------
// Duvet & pillow
// ---------------------------------------------------------------------------
export function duvetState(t: number): { mode: DuvetMode; transform?: { pos: V3; rot: V3 } } {
  const points = (tt: number) => {
    const s = guyState(tt);
    return bodyPoints(s.pos, s.quat, s.pose);
  };
  if (t < EV.dive) return { mode: { kind: "bed", points: points(t), edgeZ: -1.42, t } };
  if (t < EV.chaos) {
    const edgeZ = lerp(-1.42, -2.1, easeInOut(invLerp(EV.dive, EV.dive + 0.35, t)));
    return { mode: { kind: "bed", points: points(t), edgeZ, t } };
  }
  if (t < EV.jump) return { mode: { kind: "bed", points: points(t), edgeZ: -1.65, t } };
  if (t < EV.jump + 0.55) {
    const u = invLerp(EV.jump, EV.jump + 0.55, t);
    return {
      mode: { kind: "bed", points: points(EV.jump - 0.01), edgeZ: -1.65, t },
      transform: { pos: [0.5 * u, 3.2 * easeOut(u), 0.2 * u], rot: [0.9 * u, 0.4 * u, 0.3 * u] },
    };
  }
  if (t < 18.4) return { mode: { kind: "messy" } };
  const drop = 1 - easeIn(clamp((t - 18.45) / 0.3));
  const edgeZ = t < EV.despair ? -1.42 : lerp(-1.42, -1.66, easeOut(clamp((t - EV.despair) / 0.2)));
  return { mode: { kind: "bed", points: points(t), edgeZ, t }, transform: { pos: [0, drop * 1.3, 0], rot: [0, 0, 0] } };
}

export function pillowState(t: number): { pos: V3; rot: V3 } {
  const rest: V3 = [0, 0.62, -1.83];
  const w = windowW(t, EV.pillowUp, EV.dive + 0.1, 0.25, 0.15);
  if (w <= 0) return { pos: rest, rot: [0, 0, 0] };
  const fk = guyFK(t);
  const mid: V3 = [(fk.handL.x + fk.handR.x) / 2, (fk.handL.y + fk.handR.y) / 2 - 0.02, (fk.handL.z + fk.handR.z) / 2];
  return { pos: lerp3(rest, mid, w), rot: [0, 0, 0.08 * Math.sin(t * 6) * w] };
}

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------
const PHONE_BED: V3 = [0.47, 0.567, -1.8];
const PHONE_YAW = 0.25;
const flatQuat = (yaw: number) => qAxis(AY, yaw).multiply(qAxis(AX, -Math.PI / 2));

const ringing = (t: number) =>
  (t < EV.slap ? 1 : 0) || (t >= EV.phoneRing2 && t < 6.4 ? 1 : 0) || (t >= EV.chaos && t < EV.bubblePop ? 1 : 0) || (t >= EV.endRing ? 1 : 0);

export function phoneState(t: number): { visible: boolean; pos: V3; quat: THREE.Quaternion; screen: Screen } {
  const pulse = (t * 1.25) % 1;
  let screen: Screen = { kind: "off" };
  if (t < EV.slap) screen = { kind: "alarm", time: "7:00", label: "출근 알람", pulse };
  else if (t < EV.slap + 0.7) screen = { kind: "snoozed", text: "5분 뒤 다시 알림" };
  else if (t >= EV.phoneRing2 && t < 6.4) screen = { kind: "alarm", time: "7:10", label: "출근 알람", sub: "다시 알림 2회째", pulse };
  else if (t >= EV.chaos && t < EV.bubblePop) screen = { kind: "alarm", time: "7:25", label: "진짜 마지막 알람", sub: "다시 알림 5회째", pulse };
  else if (t >= EV.late && t < EV.jump) screen = { kind: "late", time: "8:57" };
  else if (t >= EV.phoneOut && t < 18.4) screen = { kind: "saturday" };
  else if (t >= EV.endRing) screen = { kind: "alarm", time: "9:00", label: "주말 알람 ☀️", pulse };

  // in his hand at the door
  if (t >= EV.phoneOut && t < 18.4) {
    const fk = guyFK(t);
    // screen (+z) faces his eyes, top edge (+y) points up
    const m = new THREE.Matrix4().lookAt(fk.head.clone(), fk.handR.clone(), new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const toHead = fk.head.clone().sub(fk.handR).normalize().multiplyScalar(0.03);
    return { visible: true, pos: [fk.handR.x + toHead.x, fk.handR.y + 0.05, fk.handR.z + toHead.z], quat: q, screen };
  }
  const away = t >= EV.jump && t < 18.4;
  const r = ringing(t);
  const jitter = r ? Math.sin(t * 90) * 0.004 : 0;
  const slapSquish = windowW(t, EV.slap, EV.slap + 0.15, 0.02, 0.1);
  return {
    visible: !away,
    pos: [PHONE_BED[0] + jitter, PHONE_BED[1] - slapSquish * 0.004, PHONE_BED[2] + jitter * 0.6],
    quat: flatQuat(PHONE_YAW + (r ? Math.sin(t * 70) * 0.05 : 0)),
    screen,
  };
}
export const PHONE_ON_BED = { pos: PHONE_BED, yaw: PHONE_YAW };

// ---------------------------------------------------------------------------
// Clocks, rooster, sign, toast, effects
// ---------------------------------------------------------------------------
export const SMALL_CLOCK = { pos: [NIGHTSTAND.x - 0.06, NIGHTSTAND.top, NIGHTSTAND.z + 0.1] as V3, yaw: -0.85 };
export const smallClockRing = (t: number) => (t >= EV.clockRing && t < EV.phoneRing2) || (t >= EV.chaos && t < EV.bubblePop) ? 1 : 0;

export const GIANT = { pos: [-1.45, 0, -0.95] as V3, yaw: 0.75, scale: 9 };
export function giantState(t: number) {
  if (t < EV.giantDrop) return { visible: false, y: 6, ring: 0, squash: 0 };
  const u = clamp((t - EV.giantDrop) / (EV.giantLand - EV.giantDrop));
  const y = lerp(4.5, 0, easeIn(u));
  const since = t - EV.giantLand;
  const squash = since > 0 ? Math.exp(-since * 8) * Math.sin(since * 30) * 0.12 : 0;
  const ring = t > EV.giantLand + 0.05 && t < EV.bubblePop ? 1 : 0;
  return { visible: true, y, ring, squash };
}

const HEADBOARD_TOP: V3 = [-0.38, 1.158, -2.16];
export function roosterState(t: number) {
  if (t < 8.0) return { visible: false, pos: HEADBOARD_TOP, yaw: 0, flap: 0, crow: 0, tilt: 0 };
  const flyU = clamp((t - 8.0) / (EV.roosterLand - 8.0));
  const start: V3 = [-3.1, 1.9, -0.9];
  const pos: V3 =
    flyU < 1
      ? [lerp(start[0], HEADBOARD_TOP[0], flyU), lerp(start[1], HEADBOARD_TOP[1], flyU) + Math.sin(flyU * Math.PI) * 0.45, lerp(start[2], HEADBOARD_TOP[2], easeInOut(flyU))]
      : HEADBOARD_TOP;
  const yaw = flyU < 1 ? Math.PI / 2 - 0.3 : kf(t, [[EV.roosterLand, Math.PI / 2], [EV.roosterLand + 0.15, 0.15]], easeOut);
  const crowAmount = Math.max(roosterMouth(t) > 0 ? 1 : 0, windowW(t, 8.35, 8.95, 0.05)) || windowW(t, EV.roosterCrow2, EV.roosterCrow2 + 0.6, 0.05);
  const tilt = windowW(t, 9.05, 9.6, 0.1) * 0.45;
  const flap = flyU < 1 ? 1 : windowW(t, EV.roosterLand, EV.roosterLand + 0.25, 0.01, 0.15);
  return { visible: true, pos, yaw, flap, crow: crowAmount, tilt };
}

export function signState(t: number) {
  const lift = t >= EV.signUp && t < EV.chaos ? easeOutBack(clamp((t - EV.signUp) / 0.25)) : 0;
  return { base: [0.26, 0.9, -1.45] as V3, lift, wave: Math.sin(t * 9) * 0.12 * lift };
}

export function toastFall(t: number): { visible: boolean; pos: V3; rot: V3 } {
  if (t < EV.toastDrop || t >= 18.4) return { visible: false, pos: [0, 0, 0], rot: [0, 0, 0] };
  const fk = guyFK(EV.toastDrop);
  const start = fk.head.clone().add(new THREE.Vector3(-0.2, -0.12, 0));
  const u = clamp((t - EV.toastDrop) / 0.42);
  return {
    visible: true,
    pos: [start.x - 0.15 * u, lerp(start.y, 0.012, easeIn(u)), start.z + 0.05 * u],
    rot: [lerp(0.3, -Math.PI / 2, u), 0, 1.4 * u],
  };
}

export const poofState = (t: number) => ({ center: [1.05, 1.05, -0.6] as V3, u: (t - EV.poof + 0.08) / 0.65 });
export const popState = (t: number) => {
  const fk = guyFK(EV.bubblePop - 0.02);
  return { center: [fk.head.x + 0.03, fk.head.y + 0.42, fk.head.z - 0.04] as V3, u: (t - EV.bubblePop) / 0.4 };
};

export const clockTime = storyClock;
