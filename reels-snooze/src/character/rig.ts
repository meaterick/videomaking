import * as THREE from "three";
import { lerp, V3 } from "../lib/anim";

// ---------------------------------------------------------------------------
// Rig dimensions (shared by the <Hiker/> component and the FK helper).
// Character space: faces +z, up is +y, origin (pivot) is the belly centre.
// His left side is +x.
// ---------------------------------------------------------------------------
export const RIG = {
  standHeight: 0.98, // belly centre above the soles when standing straight
  pelvis: [0, -0.12, 0] as V3,
  hipL: [0.11, -0.05, 0] as V3,
  hipR: [-0.11, -0.05, 0] as V3,
  thigh: 0.38,
  shin: 0.36,
  ankleToSole: 0.07,
  spine: [0, -0.06, 0] as V3, // from pelvis
  chest: [0, 0.3, 0] as V3, // from spine
  neck: [0, 0.3, 0] as V3, // from chest
  head: [0, 0.25, 0.02] as V3, // from neck (head centre)
  headR: 0.27,
  shoulderL: [0.27, 0.13, 0] as V3, // from chest
  shoulderR: [-0.27, 0.13, 0] as V3,
  upperArm: 0.27,
  forearm: 0.24,
};

/** Limbs rotate twist-first (about their own axis), then sideways, then forward. */
export const LIMB_ORDER: THREE.EulerOrder = "XZY";

export type Hand = "relaxed" | "fist" | "v" | "thumb" | "grip" | "open";

export type Pose = {
  lean: V3; // whole-body rotation about the pivot (x fwd, y yaw, z roll)
  pelvis: V3;
  spine: V3;
  chest: V3;
  neck: V3;
  armL: V3;
  elbowL: number;
  wristL: V3;
  armR: V3;
  elbowR: number;
  wristR: V3;
  legL: V3;
  kneeL: number;
  footL: number;
  legR: V3;
  kneeR: number;
  footR: number;
  handL: Hand;
  handR: Hand;
};

// Readable helpers -----------------------------------------------------------
/** Left shoulder: fwd = raise forward, out = raise sideways, twist = about arm axis. */
export const aL = (fwd: number, out: number, twist = 0): V3 => [-fwd, twist, out];
export const aR = (fwd: number, out: number, twist = 0): V3 => [-fwd, -twist, -out];
/** Hips: fwd = thigh forward/up, out = spread. */
export const lL = (fwd: number, out = 0, twist = 0): V3 => [-fwd, twist, out];
export const lR = (fwd: number, out = 0, twist = 0): V3 => [-fwd, -twist, -out];

const Z: V3 = [0, 0, 0];

export const STAND: Pose = {
  lean: Z,
  pelvis: Z,
  spine: [0.02, 0, 0],
  chest: Z,
  neck: Z,
  armL: aL(0.05, 0.16),
  elbowL: 0.18,
  wristL: Z,
  armR: aR(0.05, 0.16),
  elbowR: 0.18,
  wristR: Z,
  legL: lL(0, 0.03),
  kneeL: 0.02,
  footL: 0,
  legR: lR(0, 0.03),
  kneeR: 0.02,
  footR: 0,
  handL: "relaxed",
  handR: "relaxed",
};

export const pose = (over: Partial<Pose>): Pose => ({ ...STAND, ...over });

const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function blend(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    lean: lerpV(a.lean, b.lean, t),
    pelvis: lerpV(a.pelvis, b.pelvis, t),
    spine: lerpV(a.spine, b.spine, t),
    chest: lerpV(a.chest, b.chest, t),
    neck: lerpV(a.neck, b.neck, t),
    armL: lerpV(a.armL, b.armL, t),
    elbowL: lerp(a.elbowL, b.elbowL, t),
    wristL: lerpV(a.wristL, b.wristL, t),
    armR: lerpV(a.armR, b.armR, t),
    elbowR: lerp(a.elbowR, b.elbowR, t),
    wristR: lerpV(a.wristR, b.wristR, t),
    legL: lerpV(a.legL, b.legL, t),
    kneeL: lerp(a.kneeL, b.kneeL, t),
    footL: lerp(a.footL, b.footL, t),
    legR: lerpV(a.legR, b.legR, t),
    kneeR: lerp(a.kneeR, b.kneeR, t),
    footR: lerp(a.footR, b.footR, t),
    handL: t < 0.5 ? a.handL : b.handL,
    handR: t < 0.5 ? a.handR : b.handR,
  };
}

// ---------------------------------------------------------------------------
// Pose library
// ---------------------------------------------------------------------------

/** Uphill climbing gait with hiking poles. phase in radians. */
export function climbPose(phase: number): Pose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return pose({
    lean: [0.12, 0, 0],
    spine: [0.32, 0, 0.04 * s],
    chest: [0.1, 0.08 * s, 0],
    neck: [-0.38, -0.06 * s, 0],
    legL: lL(0.55 + 0.55 * s, 0.04),
    kneeL: 0.55 + 0.55 * Math.max(0, c),
    footL: -0.3 - 0.25 * s,
    legR: lR(0.55 - 0.55 * s, 0.04),
    kneeR: 0.55 + 0.55 * Math.max(0, -c),
    footR: -0.3 + 0.25 * s,
    armL: aL(0.55 - 0.55 * s, 0.22),
    elbowL: 0.7 + 0.2 * s,
    armR: aR(0.55 + 0.55 * s, 0.22),
    elbowR: 0.7 - 0.2 * s,
    handL: "grip",
    handR: "grip",
  });
}

/** Flat walk (forward if dir = 1, backward if dir = -1). */
export function walkPose(phase: number, amount = 1, dir = 1): Pose {
  const s = Math.sin(phase) * amount;
  const c = Math.cos(phase) * amount;
  return pose({
    spine: [0.06, 0.05 * s, 0],
    legL: lL(0.42 * s * dir, 0.03),
    kneeL: 0.1 + 0.6 * Math.max(0, c * dir),
    legR: lR(-0.42 * s * dir, 0.03),
    kneeR: 0.1 + 0.6 * Math.max(0, -c * dir),
    armL: aL(-0.3 * s * dir, 0.18),
    elbowL: 0.35,
    armR: aR(0.3 * s * dir, 0.18),
    elbowR: 0.35,
  });
}

export const PROUD = pose({
  lean: [-0.06, 0, 0],
  spine: [-0.14, 0, 0],
  chest: [-0.12, 0, 0],
  neck: [-0.22, 0, 0],
  armL: aL(-0.35, 0.72, -1.45),
  elbowL: 1.85,
  wristL: [0, 0, 0],
  armR: aR(-0.35, 0.72, -1.45),
  elbowR: 1.85,
  wristR: [0, 0, 0],
  legL: lL(0, 0.16),
  legR: lR(0, 0.16),
  handL: "fist",
  handR: "fist",
});

export const SELFIE = pose({
  spine: [-0.04, 0, 0],
  chest: [-0.06, -0.15, 0],
  neck: [-0.42, -0.38, 0.1],
  armR: aR(1.95, 0.2, 0.2),
  elbowR: 0.25,
  wristR: [0.5, 0, 0],
  armL: aL(0.3, 0.45, 0.4),
  elbowL: 2.3,
  wristL: [0, 0, 0],
  handR: "grip",
  handL: "v",
});

export const SELFIE_NO_V = { ...SELFIE, armL: aL(0.05, 0.2), elbowL: 0.3, handL: "relaxed" as Hand };

/** Arms windmilling while teetering backwards. */
export function windmillPose(phase: number): Pose {
  return pose({
    lean: [-0.18, 0, 0.05 * Math.sin(phase * 0.5)],
    spine: [-0.2, 0, 0],
    neck: [-0.35, 0, 0],
    armL: aL(1.5 + 1.5 * Math.sin(phase), 0.7, 0),
    elbowL: 0.3,
    armR: aR(1.5 + 1.5 * Math.sin(phase + 1.3), 0.7, 0),
    elbowR: 0.3,
    legL: lL(0.25, 0.12),
    kneeL: 0.35,
    legR: lR(-0.15 + 0.35 * Math.sin(phase * 0.7), 0.1),
    kneeR: 0.2,
    handL: "open",
    handR: "grip",
  });
}

/** Feet fly up, flailing in the air. */
export function feetUpPose(phase: number): Pose {
  return pose({
    spine: [-0.1, 0, 0],
    neck: [0.4, 0, 0],
    armL: aL(2.4 + 0.4 * Math.sin(phase * 2), 0.9),
    elbowL: 0.4,
    armR: aR(2.6 + 0.4 * Math.sin(phase * 2 + 1), 0.9),
    elbowR: 0.4,
    legL: lL(1.5 + 0.25 * Math.sin(phase * 2.2), 0.2),
    kneeL: 0.3,
    legR: lR(1.3 + 0.25 * Math.sin(phase * 2.2 + 2), 0.2),
    kneeR: 0.45,
    footL: -0.3,
    footR: -0.3,
    handL: "open",
    handR: "open",
  });
}

/** On the back, sliding head-first, everything flailing. */
export function sprawlPose(phase: number): Pose {
  return pose({
    spine: [-0.05, 0, 0.1 * Math.sin(phase)],
    neck: [0.5, 0.2 * Math.sin(phase * 1.3), 0],
    armL: aL(2.2 + 0.6 * Math.sin(phase * 2.3), 0.9 + 0.3 * Math.sin(phase * 1.7)),
    elbowL: 0.5 + 0.4 * Math.sin(phase * 2),
    armR: aR(2.0 + 0.6 * Math.sin(phase * 2.1 + 1), 0.9 + 0.3 * Math.sin(phase * 1.9)),
    elbowR: 0.5 + 0.4 * Math.sin(phase * 2 + 2),
    legL: lL(1.1 + 0.5 * Math.sin(phase * 2.6), 0.3),
    kneeL: 0.7 + 0.5 * Math.sin(phase * 2.6 + 1),
    legR: lR(1.0 + 0.5 * Math.sin(phase * 2.4 + 2), 0.3),
    kneeR: 0.7 + 0.5 * Math.sin(phase * 2.4 + 3),
    handL: "open",
    handR: "open",
  });
}

/** Cannonball tuck for rolling. wiggle adds a little limb chaos. */
export function tuckPose(phase: number, wiggle = 0.15): Pose {
  return pose({
    spine: [0.6, 0, 0],
    chest: [0.35, 0, 0],
    neck: [0.55, 0, 0],
    legL: lL(2.15 + wiggle * Math.sin(phase * 3), 0.18),
    kneeL: 2.35,
    footL: 0.3,
    legR: lR(2.15 + wiggle * Math.sin(phase * 3 + 1.4), 0.18),
    kneeR: 2.35,
    footR: 0.3,
    armL: aL(1.05 + wiggle * Math.sin(phase * 2.5), 0.12, 0.3),
    elbowL: 1.6,
    armR: aR(1.05 + wiggle * Math.sin(phase * 2.5 + 2), 0.12, 0.3),
    elbowR: 1.6,
    handL: "fist",
    handR: "fist",
  });
}

/** Spread-eagle flail in the air. */
export function starfishPose(phase: number): Pose {
  return pose({
    spine: [-0.15, 0, 0.1 * Math.sin(phase * 1.5)],
    neck: [-0.25, 0.25 * Math.sin(phase), 0],
    armL: aL(0.35 + 0.5 * Math.sin(phase * 3.1), 1.45 + 0.35 * Math.sin(phase * 2.3)),
    elbowL: 0.3 + 0.3 * Math.sin(phase * 4),
    armR: aR(0.35 + 0.5 * Math.sin(phase * 2.9 + 1), 1.45 + 0.35 * Math.sin(phase * 2.1 + 1)),
    elbowR: 0.3 + 0.3 * Math.sin(phase * 4 + 1),
    legL: lL(0.3 + 0.45 * Math.sin(phase * 3.3 + 2), 0.75),
    kneeL: 0.25 + 0.35 * Math.sin(phase * 3.7) ** 2,
    legR: lR(0.3 + 0.45 * Math.sin(phase * 3.5), 0.75),
    kneeR: 0.25 + 0.35 * Math.sin(phase * 3.3 + 1) ** 2,
    handL: "open",
    handR: "open",
  });
}

/** Head-first dive (arms forward like a superhero). */
export const DIVE = pose({
  spine: [-0.15, 0, 0],
  neck: [-0.5, 0, 0],
  armL: aL(2.9, 0.25),
  elbowL: 0.1,
  armR: aR(2.9, 0.25),
  elbowR: 0.1,
  legL: lL(-0.15, 0.12),
  kneeL: 0.25,
  legR: lR(-0.15, 0.12),
  kneeR: 0.4,
  handL: "open",
  handR: "open",
});

/** Upside down in the leaf pile, boots kicking. */
export function buriedPose(phase: number, kick: number): Pose {
  return pose({
    spine: [0.1, 0, 0],
    armL: aL(0.2, 0.5),
    armR: aR(0.2, 0.5),
    legL: lL(0.05 + 0.25 * kick * Math.sin(phase), 0.28),
    kneeL: 0.2 + 0.9 * kick * Math.max(0, Math.sin(phase)),
    legR: lR(0.05 + 0.25 * kick * Math.sin(phase + Math.PI), 0.28),
    kneeR: 0.2 + 0.9 * kick * Math.max(0, Math.sin(phase + Math.PI)),
    footL: 0.4,
    footR: 0.4,
  });
}

/** Sitting in the leaves, dizzy and swaying. sway 0..1 */
export function dizzyPose(phase: number, sway: number): Pose {
  return pose({
    spine: [0.12 + 0.12 * sway * Math.sin(phase), 0, 0.16 * sway * Math.cos(phase)],
    chest: [0.05, 0, 0.05 * sway * Math.cos(phase)],
    neck: [0.08 + 0.2 * sway * Math.sin(phase + 0.8), 0.2 * sway * Math.sin(phase * 0.5), 0.25 * sway * Math.cos(phase + 0.8)],
    armL: aL(0.35, 0.55),
    elbowL: 0.9,
    armR: aR(0.35, 0.55),
    elbowR: 0.9,
    legL: lL(1.4, 0.3),
    kneeL: 1.2,
    legR: lR(1.4, 0.3),
    kneeR: 1.2,
    handL: "relaxed",
    handR: "relaxed",
  });
}

/** Sitting, holding the phone in front of the face (right hand). */
export const LOOK_PHONE = pose({
  spine: [0.18, 0, 0],
  neck: [0.38, 0, 0],
  armR: aR(1.0, 0.15, 0.4),
  elbowR: 1.45,
  wristR: [0.6, 0, 0],
  armL: aL(0.6, 0.35, 0.3),
  elbowL: 1.4,
  legL: lL(1.4, 0.3),
  kneeL: 1.2,
  legR: lR(1.4, 0.3),
  kneeR: 1.2,
  handR: "grip",
  handL: "relaxed",
});

/** Sitting, thumbs up with the left hand, phone in the right. */
export const THUMBS_UP = pose({
  spine: [-0.02, 0, 0],
  chest: [-0.06, 0, 0],
  neck: [-0.08, 0.1, 0.06],
  armL: aL(1.3, 0.12, 0),
  elbowL: 0.95,
  wristL: [0, 0, 0],
  armR: aR(0.5, 0.3, 0.3),
  elbowR: 1.3,
  wristR: [0.4, 0, 0],
  legL: lL(1.4, 0.3),
  kneeL: 1.2,
  legR: lR(1.4, 0.3),
  kneeR: 1.2,
  handL: "thumb",
  handR: "grip",
});

// ---------------------------------------------------------------------------
// Forward kinematics: world positions of body parts, mirroring <Hiker/>.
// ---------------------------------------------------------------------------
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

const node = (pos: V3, rot: V3, order: THREE.EulerOrder = "XYZ") => {
  const m = new THREE.Matrix4();
  tmpE.set(rot[0], rot[1], rot[2], order);
  tmpQ.setFromEuler(tmpE);
  m.compose(new THREE.Vector3(...pos), tmpQ, new THREE.Vector3(1, 1, 1));
  return m;
};

export type FK = {
  head: THREE.Vector3;
  headTop: THREE.Vector3;
  handL: THREE.Vector3;
  handR: THREE.Vector3;
  footL: THREE.Vector3;
  footR: THREE.Vector3;
  headQuat: THREE.Quaternion;
  handRQuat: THREE.Quaternion;
};

export function forwardKinematics(rootPos: V3, rootQuat: THREE.Quaternion, p: Pose): FK {
  const root = new THREE.Matrix4().compose(new THREE.Vector3(...rootPos), rootQuat, new THREE.Vector3(1, 1, 1));
  const lean = root.clone().multiply(node([0, 0, 0], p.lean));
  const pelvis = lean.clone().multiply(node(RIG.pelvis, p.pelvis));
  const spine = pelvis.clone().multiply(node(RIG.spine, p.spine));
  const chest = spine.clone().multiply(node(RIG.chest, p.chest));
  const neck = chest.clone().multiply(node(RIG.neck, p.neck));
  const head = neck.clone().multiply(node(RIG.head, [0, 0, 0]));
  const arm = (side: 1 | -1) => {
    const sh = chest.clone().multiply(node(side === 1 ? RIG.shoulderL : RIG.shoulderR, side === 1 ? p.armL : p.armR, LIMB_ORDER));
    const el = sh.clone().multiply(node([0, -RIG.upperArm, 0], [-(side === 1 ? p.elbowL : p.elbowR), 0, 0]));
    const wr = el.clone().multiply(node([0, -RIG.forearm, 0], side === 1 ? p.wristL : p.wristR));
    return wr.clone().multiply(node([0, -0.07, 0.01], [0, 0, 0]));
  };
  const leg = (side: 1 | -1) => {
    const hip = pelvis.clone().multiply(node(side === 1 ? RIG.hipL : RIG.hipR, side === 1 ? p.legL : p.legR, LIMB_ORDER));
    const knee = hip.clone().multiply(node([0, -RIG.thigh, 0], [side === 1 ? p.kneeL : p.kneeR, 0, 0]));
    const ankle = knee.clone().multiply(node([0, -RIG.shin, 0], [side === 1 ? p.footL : p.footR, 0, 0]));
    return ankle.clone().multiply(node([0, -RIG.ankleToSole, 0.05], [0, 0, 0]));
  };
  const pos = (m: THREE.Matrix4) => new THREE.Vector3().setFromMatrixPosition(m);
  const quat = (m: THREE.Matrix4) => {
    const q = new THREE.Quaternion();
    m.decompose(new THREE.Vector3(), q, new THREE.Vector3());
    return q;
  };
  const handRM = arm(-1);
  const headTop = head.clone().multiply(node([0, RIG.headR, 0], [0, 0, 0]));
  return {
    head: pos(head),
    headTop: pos(headTop),
    handL: pos(arm(1)),
    handR: pos(handRM),
    footL: pos(leg(1)),
    footR: pos(leg(-1)),
    headQuat: quat(head),
    handRQuat: quat(handRM),
  };
}

// ---------------------------------------------------------------------------
// Body sample points (world space) — used to drape the blanket over the body.
// ---------------------------------------------------------------------------
export type BodyPoint = { p: THREE.Vector3; r: number };

export function bodyPoints(rootPos: V3, rootQuat: THREE.Quaternion, p: Pose): BodyPoint[] {
  const root = new THREE.Matrix4().compose(new THREE.Vector3(...rootPos), rootQuat, new THREE.Vector3(1, 1, 1));
  const lean = root.clone().multiply(node([0, 0, 0], p.lean));
  const pelvis = lean.clone().multiply(node(RIG.pelvis, p.pelvis));
  const spine = pelvis.clone().multiply(node(RIG.spine, p.spine));
  const chest = spine.clone().multiply(node(RIG.chest, p.chest));
  const neck = chest.clone().multiply(node(RIG.neck, p.neck));
  const head = neck.clone().multiply(node(RIG.head, [0, 0, 0]));
  const at = (m: THREE.Matrix4, off: V3 = [0, 0, 0]) =>
    new THREE.Vector3(...off).applyMatrix4(m);
  const pts: BodyPoint[] = [
    { p: at(spine, [0, 0.16, 0.03]), r: 0.3 }, // belly
    { p: at(chest, [0, 0.05, 0]), r: 0.27 },
    { p: at(pelvis, [0, 0.02, 0]), r: 0.25 },
    { p: at(head), r: 0.28 },
  ];
  for (const side of [1, -1] as const) {
    const sh = chest.clone().multiply(node(side === 1 ? RIG.shoulderL : RIG.shoulderR, side === 1 ? p.armL : p.armR, LIMB_ORDER));
    const el = sh.clone().multiply(node([0, -RIG.upperArm, 0], [-(side === 1 ? p.elbowL : p.elbowR), 0, 0]));
    const hand = el.clone().multiply(node([0, -RIG.forearm - 0.06, 0], [0, 0, 0]));
    pts.push({ p: at(sh, [0, -RIG.upperArm / 2, 0]), r: 0.1 }, { p: at(el), r: 0.09 }, { p: at(hand), r: 0.08 });
    const hip = pelvis.clone().multiply(node(side === 1 ? RIG.hipL : RIG.hipR, side === 1 ? p.legL : p.legR, LIMB_ORDER));
    const knee = hip.clone().multiply(node([0, -RIG.thigh, 0], [side === 1 ? p.kneeL : p.kneeR, 0, 0]));
    const ankle = knee.clone().multiply(node([0, -RIG.shin, 0], [side === 1 ? p.footL : p.footR, 0, 0]));
    pts.push(
      { p: at(hip, [0, -RIG.thigh / 2, 0]), r: 0.12 },
      { p: at(knee), r: 0.11 },
      { p: at(knee, [0, -RIG.shin / 2, 0]), r: 0.1 },
      { p: at(ankle, [0, -0.02, 0.08]), r: 0.11 },
    );
  }
  return pts;
}
