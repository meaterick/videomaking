import * as THREE from "three";
import {
  clamp,
  easeIn,
  easeInOut,
  easeOut,
  easeOutBack,
  invLerp,
  kf,
  lerp,
  monotoneCubic,
  noise1,
  smoothstep,
  V3,
  windowW,
} from "../lib/anim";
import { EV, hikerMouth, hikerSpeaking, realTime } from "../timeline";
import { heightAt, normalAt, slopeAngleX, TRAILHEAD_X } from "../world/terrain";
import { blink, face, Face } from "./face";
import {
  blend,
  buriedPose,
  climbPose,
  DIVE,
  dizzyPose,
  feetUpPose,
  forwardKinematics,
  LOOK_PHONE,
  Pose,
  pose,
  PROUD,
  aR,
  RIG,
  SELFIE,
  SELFIE_NO_V,
  sprawlPose,
  starfishPose,
  THUMBS_UP,
  tuckPose,
  walkPose,
  windmillPose,
} from "./rig";

export type HikerState = {
  pos: V3;
  quat: THREE.Quaternion;
  pose: Pose;
  face: Face;
  capOn: boolean;
  phoneInHand: boolean;
  polesInHands: boolean;
  stars: number;
};

// ---------------------------------------------------------------------------
// Orientation helpers. yaw: facing (0 = +z, -PI/2 = -x). tumble: rotation about
// world z (negative = head goes towards +x, i.e. down the slope). roll: world x.
// ---------------------------------------------------------------------------
const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
export function orient(yaw: number, tumble = 0, roll = 0): THREE.Quaternion {
  const qy = new THREE.Quaternion().setFromAxisAngle(AY, yaw);
  const qx = new THREE.Quaternion().setFromAxisAngle(AX, roll);
  const qz = new THREE.Quaternion().setFromAxisAngle(AZ, tumble);
  return qz.multiply(qx).multiply(qy);
}

const FACE_X = -Math.PI / 2; // facing up the mountain (-x)
const STAND_Y = RIG.standHeight;

/** Combine upper body of one pose with the legs of another. */
const withLegs = (upper: Pose, legs: Pose): Pose => ({
  ...upper,
  legL: legs.legL,
  kneeL: legs.kneeL,
  footL: legs.footL,
  legR: legs.legR,
  kneeR: legs.kneeR,
  footR: legs.footR,
});

// ---------------------------------------------------------------------------
// Climb
// ---------------------------------------------------------------------------
const CLIMB_X0 = 19.6;
const CLIMB_SPEED = 1.4;
const climbX = (t: number) => CLIMB_X0 - CLIMB_SPEED * t;
const GAIT_HZ = 0.95;

// ---------------------------------------------------------------------------
// Backward selfie steps (x positions while facing -x)
// ---------------------------------------------------------------------------
const BACK_X: [number, number][] = [
  [EV.backSteps[0], 1.2],
  [EV.backSteps[0] + 0.5, 1.6],
  [EV.backSteps[1], 1.6],
  [EV.backSteps[1] + 0.5, 2.0],
  [EV.backSteps[2], 2.0],
  [EV.backSteps[2] + 0.5, 2.4],
  [EV.pineStep, 2.4],
  [EV.pineStep + 0.8, 2.72],
];

// ---------------------------------------------------------------------------
// Tumble track: x over world time, hops with apex heights and extra flips.
// ---------------------------------------------------------------------------
const TUMBLE_KEYS: [number, number][] = [
  [25.15, 5.2],
  [25.9, 8.0],
  [27.0, 14.5],
  [28.0, 22.5],
  [28.8, 30],
  [29.5, 37],
  [30.4, 46],
  [30.9, 52],
  [31.7, 61],
  [32.6, 70],
  [33.0, 74],
  [33.7, 82],
  [34.6, 92],
  [35.0, 96],
  [35.5, 101],
  [36.6, 113],
  [37.1, 117.6],
  [39.3, TRAILHEAD_X],
];
export const tumbleX = monotoneCubic(
  TUMBLE_KEYS.map((k) => k[0]),
  TUMBLE_KEYS.map((k) => k[1]),
);

export const HOPS = [
  { t0: 28.8, t1: 29.5, h: 1.5, flips: 0.5, flail: false },
  { t0: 30.9, t1: 31.7, h: 2.6, flips: 1, flail: true },
  { t0: 33.0, t1: 33.7, h: 1.9, flips: 0.5, flail: true },
  { t0: 35.0, t1: 35.5, h: 0.9, flips: 0.25, flail: false },
];
export const LAUNCH = { t0: 37.1, t1: EV.landPile, h: 10.5 };

/** Ground contact moments (world time) for SFX, dust and camera shake. */
export const IMPACTS: { t: number; strength: number }[] = [
  { t: EV.slipImpact, strength: 1 },
  { t: 27.1, strength: 0.35 },
  { t: 28.2, strength: 0.4 },
  ...HOPS.map((h) => ({ t: h.t1, strength: h.h > 2 ? 1 : 0.6 })),
  { t: 36.1, strength: 0.4 },
];

const BALL_R = 0.62;
const PILE_Y = 0.62;
const LYING_R = 0.5;

const groundOffset = (x: number, lift: number): V3 => {
  const n = normalAt(x, 0);
  return [x + n[0] * lift, heightAt(x, 0) + n[1] * lift, n[2] * lift];
};

const hopAt = (t: number) => HOPS.find((h) => t >= h.t0 && t <= h.t1);

const flipExtra = (t: number) =>
  HOPS.reduce((acc, h) => acc + h.flips * Math.PI * 2 * easeInOut(clamp((t - h.t0) / (h.t1 - h.t0))), 0);

const THETA_LAND = -(Math.PI / 2 + slopeAngleX(5.2));
const rollTheta = (t: number) => {
  const x0 = tumbleX(EV.rollStart);
  return THETA_LAND - 0.6 - ((tumbleX(t) - x0) / BALL_R) * 0.42 - flipExtra(t);
};

const thetaAtLaunch = rollTheta(LAUNCH.t0);
// land upside down (theta ≡ -PI mod 2PI) after at least 1.5 extra turns
const THETA_PILE = (() => {
  const target = thetaAtLaunch - Math.PI * 3;
  const k = Math.round((target + Math.PI) / (2 * Math.PI));
  return -Math.PI + k * 2 * Math.PI;
})();

function tumblePos(t: number): V3 {
  if (t >= LAUNCH.t0) {
    const tau = clamp((t - LAUNCH.t0) / (LAUNCH.t1 - LAUNCH.t0));
    const a = groundOffset(tumbleX(LAUNCH.t0), BALL_R);
    const b: V3 = [TRAILHEAD_X, PILE_Y, 0];
    return [lerp(a[0], b[0], tau), lerp(a[1], b[1], tau) + 4 * LAUNCH.h * tau * (1 - tau), 0];
  }
  const hop = hopAt(t);
  if (hop) {
    const tau = (t - hop.t0) / (hop.t1 - hop.t0);
    const a = groundOffset(tumbleX(hop.t0), BALL_R);
    const b = groundOffset(tumbleX(hop.t1), BALL_R);
    return [tumbleX(t), lerp(a[1], b[1], tau) + 4 * hop.h * tau * (1 - tau), 0];
  }
  const x = tumbleX(t);
  const lift = lerp(LYING_R, BALL_R, smoothstep(EV.rollStart, EV.rollStart + 0.3, t));
  const p = groundOffset(x, lift);
  // little bounces while rolling
  const bounce = Math.abs(Math.sin(t * 9.5)) * 0.12 * smoothstep(EV.rollStart, EV.rollStart + 0.5, t);
  return [p[0], p[1] + bounce, p[2]];
}

// ---------------------------------------------------------------------------
// Main hiker performance
// ---------------------------------------------------------------------------
export function hikerState(t: number): HikerState {
  const real = realTime(t);
  const talking = hikerSpeaking(real);
  const mouth = hikerMouth(real);
  const bl = blink(t);

  // ---------------- climbing ----------------
  if (t < EV.climbEnd) {
    const x = climbX(t);
    const ph = t * GAIT_HZ * Math.PI * 2;
    const y = heightAt(x, 0) + 0.86 + Math.abs(Math.sin(ph)) * 0.035;
    const f = face({
      eyeL: 0.55 * bl,
      eyeR: 0.55 * bl,
      brow: -0.2,
      browTilt: 0.8,
      mouth: talking ? "flat" : "pant",
      open: talking ? mouth : 0.2,
      blush: 0.7,
      sweat: 1,
      look: [0, 0.6],
    });
    return {
      pos: [x, y, 0],
      quat: orient(FACE_X),
      pose: climbPose(ph),
      face: f,
      capOn: true,
      phoneInHand: false,
      polesInHands: true,
      stars: 0,
    };
  }

  // ---------------- summit: arrive, brag, phone, selfie, step back ----------------
  if (t < EV.pineSlipStart) {
    // position
    let x: number;
    if (t < EV.plantPoles) x = kf(t, [[EV.climbEnd, climbX(EV.climbEnd)], [EV.plantPoles, 1.2]], easeOut);
    else x = kf(t, BACK_X, easeInOut);

    // yaw: face camera (+z) for the brag, then face -x for the selfie
    const yaw = kf(
      t,
      [
        [12.05, FACE_X],
        [12.65, 0],
        [15.8, 0],
        [16.4, FACE_X],
      ],
      easeInOut,
    );

    // body pose
    let p: Pose;
    const walkPh = (t - EV.climbEnd) * 1.9 * Math.PI * 2;
    if (t < EV.plantPoles + 0.2) {
      const walk = walkPose(walkPh, 1 - smoothstep(EV.plantPoles - 0.3, EV.plantPoles + 0.2, t));
      const plant = pose({ armL: [-0.6, 0, 0.3], elbowL: 0.6, armR: [-0.6, 0, -0.3], elbowR: 0.6, handL: "grip", handR: "grip" });
      p = blend(walk, withLegs(plant, walk), smoothstep(EV.plantPoles - 0.4, EV.plantPoles, t));
    } else if (t < 15.2) {
      const breathe = Math.sin(t * 2.4) * 0.025;
      const proud = { ...PROUD, chest: [PROUD.chest[0] - breathe, 0, 0] as V3 };
      p = blend(pose({}), proud, smoothstep(EV.plantPoles + 0.1, EV.plantPoles + 0.6, t));
    } else {
      // reach for the pocket, then raise the phone
      const reach = pose({ armR: aR(0.75, -0.15, -0.4), elbowR: 2.1, handR: "grip", spine: [0.04, 0, 0], neck: [0.15, 0, 0] });
      let upper = blend(PROUD, reach, smoothstep(15.2, 15.55, t));
      upper = blend(upper, pose({ armR: aR(0.8, 0.1, 0), elbowR: 1.4, handR: "grip" }), smoothstep(15.6, 15.95, t));
      upper = blend(upper, SELFIE, smoothstep(16.2, 16.85, t));
      upper = blend(upper, SELFIE_NO_V, smoothstep(18.2, 18.6, t));
      // legs: stepping back
      let legs = pose({});
      const steps = [...EV.backSteps.map((s) => [s, s + 0.5]), [EV.pineStep, EV.pineStep + 0.8]];
      steps.forEach(([a, b], i) => {
        if (t >= a && t <= b) {
          const u = invLerp(a, b, t);
          legs = walkPose(i % 2 === 0 ? u * Math.PI : Math.PI + u * Math.PI, Math.sin(u * Math.PI), -1);
        }
      });
      // turning on the spot gets a little shuffle
      if (t > 15.8 && t < 16.4) legs = walkPose((t - 15.8) * 10, 0.35);
      p = withLegs(upper, legs);
      // the last step: right foot reaching back onto the pinecone, then weight on it
      if (t >= EV.pineStep) {
        const u = invLerp(EV.pineStep, EV.pineStep + 0.8, t);
        p = { ...p, legR: [lerp(0, 0.35, Math.sin(u * Math.PI)), 0, -0.03], kneeR: 0.5 * Math.sin(u * Math.PI) };
      }
    }

    // face
    let f: Face;
    if (t < EV.plantPoles) {
      f = face({ eyeL: 0.8 * bl, eyeR: 0.8 * bl, mouth: "pant", open: talking ? mouth : 0.1, blush: 0.6, sweat: 0.7 });
    } else if (t < 15.2) {
      const happy = t > 12.5 && t < 14.2;
      f = face({
        eyeStyle: happy ? "happy" : "normal",
        eyeL: bl,
        eyeR: bl,
        brow: 0.5,
        mouth: "grin",
        open: talking ? mouth : 0,
        blush: 0.5,
      });
    } else if (t < 17.0) {
      f = face({ eyeL: bl, eyeR: bl, mouth: talking ? "smile" : "smile", open: talking ? mouth : 0, look: [0, -0.3], brow: 0.2 });
    } else if (t < 18.2) {
      f = face({ eyeL: 0.05, eyeR: bl * 1.05, mouth: "grin", open: 0, brow: 0.4, blush: 0.4 }); // wink
    } else {
      f = face({
        eyeL: bl,
        eyeR: bl,
        mouth: talking ? "smile" : "grin",
        open: talking ? mouth : 0,
        brow: 0.25,
        look: [0, 0],
      });
    }

    const standY = STAND_Y + (t < EV.plantPoles ? Math.abs(Math.sin(walkPh)) * 0.03 : 0);
    return {
      pos: [x, heightAt(x, 0) + standY, 0],
      quat: orient(yaw),
      pose: p,
      face: f,
      capOn: true,
      phoneInHand: t >= 15.6,
      polesInHands: t < EV.plantPoles,
      stars: 0,
    };
  }

  // ---------------- the slip ----------------
  if (t < EV.slipImpact) {
    const xStand = 2.72;
    const baseY = heightAt(xStand, 0) + STAND_Y;
    let pos: V3;
    let theta: number;
    let p: Pose;
    if (t < EV.feetUp) {
      const u = t - EV.pineSlipStart;
      theta = -0.1 - 0.12 * Math.sin(u * 2 * Math.PI * 1.6) * smoothstep(0, 0.2, u);
      pos = [xStand + 0.08 * smoothstep(0, 1, u), baseY - 0.04, 0];
      p = blend(SELFIE_NO_V, windmillPose(u * 11), smoothstep(0, 0.18, u));
    } else if (t < 24.6) {
      const u = invLerp(EV.feetUp, 24.6, t);
      theta = lerp(-0.1 - 0.12 * Math.sin(1.0 * 2 * Math.PI * 1.6), -1.45, easeOut(u));
      pos = [lerp(xStand + 0.08, 3.15, u), lerp(baseY - 0.04, baseY + 0.32, easeOut(u)), 0];
      p = blend(windmillPose((t - EV.pineSlipStart) * 11), feetUpPose(t * 6), smoothstep(0, 0.35, u));
    } else {
      const u = invLerp(24.6, EV.slipImpact, t);
      const end = groundOffset(5.2, LYING_R);
      pos = [lerp(3.15, end[0], u), lerp(baseY + 0.32, end[1], easeIn(u)), 0];
      theta = lerp(-1.45, THETA_LAND, easeIn(u));
      p = blend(feetUpPose(t * 6), sprawlPose(t * 7), smoothstep(0.3, 1, u));
    }
    const shocked = face({
      eyeL: 1.3,
      eyeR: 1.3,
      pupil: 0.65,
      brow: 1,
      browTilt: 0.4,
      mouth: "o",
      open: talking ? mouth : 0.3,
    });
    return {
      pos,
      quat: orient(FACE_X, theta),
      pose: p,
      face: shocked,
      capOn: true,
      phoneInHand: t < 24.25,
      polesInHands: false,
      stars: 0,
    };
  }

  // ---------------- slide & tumble & launch ----------------
  if (t < EV.landPile) {
    const pos = tumblePos(t);
    let theta: number;
    if (t < EV.rollStart) {
      theta = lerp(THETA_LAND, THETA_LAND - 0.6, smoothstep(25.5, EV.rollStart, t));
    } else if (t < LAUNCH.t0) {
      theta = rollTheta(t);
    } else {
      theta = lerp(thetaAtLaunch, THETA_PILE, easeInOut(invLerp(LAUNCH.t0, LAUNCH.t1, t)));
    }
    const settle = t >= LAUNCH.t0 ? 1 - smoothstep(38.4, 39.2, t) : 1;
    const wob = smoothstep(EV.rollStart, EV.rollStart + 0.6, t) * settle;
    const roll = (0.45 * Math.sin(t * 1.7) + 0.2 * noise1(t * 2.3, 3)) * wob;
    const yaw = FACE_X + (0.3 * Math.sin(t * 1.1) + 0.2 * noise1(t * 1.7, 7)) * wob;

    let p: Pose;
    if (t < EV.rollStart) {
      p = blend(sprawlPose(t * 7), tuckPose(t * 6), smoothstep(25.6, EV.rollStart, t));
    } else if (t < LAUNCH.t0) {
      const semi = windowW(t, 29.5, 30.9, 0.2);
      p = tuckPose(t * 6, 0.15 + 0.5 * semi);
      const hop = hopAt(t);
      if (hop?.flail) {
        const w = windowW(t, hop.t0, hop.t1, (hop.t1 - hop.t0) * 0.2, (hop.t1 - hop.t0) * 0.25);
        p = blend(p, starfishPose(t * 8), w);
      }
    } else {
      const u = invLerp(LAUNCH.t0, LAUNCH.t1, t);
      p = blend(tuckPose(t * 6), starfishPose(t * 7), smoothstep(0, 0.12, u));
      p = blend(p, DIVE, smoothstep(0.72, 0.9, u));
    }
    const scream = face({
      eyeStyle: "squeeze",
      mouth: "scream",
      open: talking ? 0.3 + mouth * 0.7 : 0.6,
      brow: 0.8,
      browTilt: 0.7,
    });
    return {
      pos,
      quat: orient(yaw, theta, roll),
      pose: p,
      face: scream,
      capOn: t < CAP_FLY.t0,
      phoneInHand: false,
      polesInHands: false,
      stars: 0,
    };
  }

  // ---------------- leaf pile: buried, pop out, dizzy, phone, thumbs up ----------------
  const PILE: V3 = [TRAILHEAD_X, PILE_Y, 0];
  const SIT: V3 = [TRAILHEAD_X, 0.95, 0.12];
  if (t < EV.popOut) {
    const u = t - EV.landPile;
    const squash = -0.22 * Math.exp(-u * 6) * Math.sin(u * 18 + 0.3);
    const kick = windowW(t, 39.8, 41.9, 0.12) * 1.25;
    return {
      pos: [PILE[0], PILE[1] + squash, PILE[2]],
      quat: orient(FACE_X, THETA_PILE),
      pose: buriedPose(t * 15, kick),
      face: face({ eyeStyle: "squeeze", mouth: "flat" }),
      capOn: false,
      phoneInHand: false,
      polesInHands: false,
      stars: 0,
    };
  }

  // pop out with a flip, then sit dizzy
  const popU = clamp((t - EV.popOut) / 0.55);
  if (popU < 1) {
    const y = lerp(PILE[1], SIT[1], popU) + 4 * 1.1 * popU * (1 - popU);
    return {
      pos: [lerp(PILE[0], SIT[0], popU), y, lerp(PILE[2], SIT[2], popU)],
      quat: orient(lerp(FACE_X, 0, easeOut(popU)), lerp(THETA_PILE, THETA_PILE - Math.PI, easeOutBack(popU))),
      pose: blend(buriedPose(t * 15, 0), dizzyPose(t * 5, 1), smoothstep(0.2, 0.9, popU)),
      face: face({ eyeStyle: "dizzy", mouth: "o", open: 0.3 }),
      capOn: false,
      phoneInHand: false,
      polesInHands: false,
      stars: smoothstep(0.5, 1, popU),
    };
  }

  // ---------- sitting in the pile ----------
  const sway = kf(t, [[42.6, 1], [44.4, 0.35], [46, 0.12]], easeInOut);
  let p = dizzyPose(t * 4.5, sway);
  // look at the trailhead gate (to his left) and back
  const turn = kf(t, [[43.7, 0], [44.3, 0.95], [45.0, 0.95], [45.5, 0]], easeInOut);
  p = { ...p, neck: [p.neck[0] - 0.1 * turn, p.neck[1] + turn, p.neck[2]] };

  let f: Face;
  if (t < 43.6) f = face({ eyeStyle: "dizzy", mouth: "o", open: 0.25 + mouth });
  else if (t < EV.phoneBonk)
    f = face({
      eyeL: 1.1 * bl,
      eyeR: 1.1 * bl,
      pupil: 0.8,
      brow: 0.9,
      browTilt: 0.3,
      mouth: talking ? "o" : "flat",
      open: talking ? mouth : 0,
      look: [turn * 0.9, 0],
    });
  else if (t < 49.2) f = face({ eyeStyle: "squeeze", mouth: "o", open: 0.4 });
  else if (t < EV.thumbsUp) f = face({ eyeL: 1.25, eyeR: 1.25, pupil: 0.7, brow: 1, mouth: "o", open: 0.2, look: [0, -0.8] });
  else
    f = face({
      eyeStyle: talking ? "normal" : "happy",
      eyeL: bl,
      eyeR: bl,
      mouth: "grin",
      open: talking ? mouth : 0,
      brow: 0.6,
      blush: 0.6,
    });

  // phone bonk & catch
  if (t >= EV.phoneBonk - 0.1) {
    p = blend(p, LOOK_PHONE, smoothstep(49.0, 49.4, t));
    p = blend(p, THUMBS_UP, easeOutBack(clamp((t - EV.thumbsUp) / 0.45)));
  }
  const bonk = t > EV.phoneBonk && t < EV.phoneBonk + 0.4 ? Math.sin(((t - EV.phoneBonk) / 0.4) * Math.PI) * 0.12 : 0;
  return {
    pos: [SIT[0], SIT[1] - bonk * 0.5, SIT[2]],
    quat: orient(0, bonk * 0.6),
    pose: p,
    face: f,
    capOn: false,
    phoneInHand: t >= EV.phoneCatch,
    polesInHands: false,
    stars: 1 - smoothstep(46.2, 47.0, t),
  };
}

export const hikerFK = (t: number) => {
  const s = hikerState(t);
  return forwardKinematics(s.pos, s.quat, s.pose);
};

// ---------------------------------------------------------------------------
// Props that leave the hiker: phone, cap. Squirrel & pinecone.
// ---------------------------------------------------------------------------
export const SQUIRREL_ROCK: V3 = [79, heightAt(79, 5.6), 5.6];
export const ROCK_TOP = 0.62;
export const SQUIRREL_HEAD: V3 = [SQUIRREL_ROCK[0], SQUIRREL_ROCK[1] + ROCK_TOP + 0.36, SQUIRREL_ROCK[2]];

export const CAP_FLY = { t0: HOPS[2].t0 + 0.08, t1: HOPS[2].t0 + 1.0 };

let capStart: THREE.Vector3 | null = null;
export function capState(t: number): { mode: "head" | "fly" | "squirrel"; pos: V3; quat: THREE.Quaternion } {
  if (t < CAP_FLY.t0) return { mode: "head", pos: [0, 0, 0], quat: new THREE.Quaternion() };
  if (t >= CAP_FLY.t1) return { mode: "squirrel", pos: SQUIRREL_HEAD, quat: new THREE.Quaternion() };
  if (!capStart) capStart = hikerFK(CAP_FLY.t0).headTop;
  const u = (t - CAP_FLY.t0) / (CAP_FLY.t1 - CAP_FLY.t0);
  const pos: V3 = [
    lerp(capStart.x, SQUIRREL_HEAD[0], u),
    lerp(capStart.y, SQUIRREL_HEAD[1], u) + 4 * 2.4 * u * (1 - u),
    lerp(capStart.z, SQUIRREL_HEAD[2], easeInOut(u)),
  ];
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.3, 1, 0.5).normalize(), u * Math.PI * 2 * 2.5);
  const settle = new THREE.Quaternion().slerp(spin, 1 - smoothstep(0.8, 1, u));
  return { mode: "fly", pos, quat: settle };
}

let phoneRelease: THREE.Vector3 | null = null;
const PHONE_RELEASE_T = 24.25;
export function phoneState(t: number): { mode: "hidden" | "hand" | "world"; pos: V3; quat: THREE.Quaternion } {
  const hidden = { mode: "hidden" as const, pos: [0, 0, 0] as V3, quat: new THREE.Quaternion() };
  if (t < 15.6) return hidden;
  if (t < PHONE_RELEASE_T) return { ...hidden, mode: "hand" };
  if (t < 26.5) {
    if (!phoneRelease) phoneRelease = hikerFK(PHONE_RELEASE_T).handR;
    const u = t - PHONE_RELEASE_T;
    const pos: V3 = [phoneRelease.x - 0.6 * u, phoneRelease.y + 13 * u - 3 * u * u, phoneRelease.z + 0.3 * u];
    return { mode: "world", pos, quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(u * 9, u * 5, u * 3)) };
  }
  if (t < 48.2) return hidden;
  if (t < EV.phoneCatch) {
    const head = hikerFK(EV.phoneBonk).headTop;
    const hand = hikerFK(EV.phoneCatch).handR;
    if (t < EV.phoneBonk) {
      const u = invLerp(48.2, EV.phoneBonk, t);
      return {
        mode: "world",
        pos: [head.x, lerp(head.y + 9, head.y + 0.02, easeIn(u)), head.z],
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(u * 7, 0, u * 2)),
      };
    }
    const u = invLerp(EV.phoneBonk, EV.phoneCatch, t);
    return {
      mode: "world",
      pos: [lerp(head.x, hand.x, u), lerp(head.y, hand.y, u) + 4 * 0.45 * u * (1 - u), lerp(head.z, hand.z, u)],
      quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(7 + u * 5, 0, 2)),
    };
  }
  return { ...hidden, mode: "hand" };
}

let pinePos: V3 | null = null;
export function pineconeState(t: number): { pos: V3; rot: V3; squash: number } {
  if (!pinePos) {
    const foot = hikerFK(EV.pineStep + 0.8).footR;
    pinePos = [foot.x + 0.02, heightAt(foot.x, foot.z), foot.z];
  }
  const [px, py, pz] = pinePos;
  if (t < EV.pineSlipStart) {
    const squash = windowW(t, EV.pineStep + 0.7, EV.pineSlipStart + 0.1, 0.1) * 0.25;
    return { pos: [px, py + 0.05, pz], rot: [0, 0.4, Math.PI / 2], squash };
  }
  // shoots out forward (-x) and rolls to a stop
  const u = t - EV.pineSlipStart;
  const d = 2.6 * (1 - Math.exp(-u * 2.2));
  const hop = u < 0.5 ? Math.sin((u / 0.5) * Math.PI) * 0.25 : 0;
  const x = px - d;
  return { pos: [x, heightAt(x, pz) + 0.05 + hop, pz], rot: [0, 0.4, Math.PI / 2 + d / 0.05], squash: 0 };
}

export function squirrelState(t: number) {
  const hiker = t > 31.5 && t < 35.5 ? hikerState(t).pos : null;
  // head yaw: look at the hiker while he passes, otherwise at the camera-ish
  let lookYaw = 0.5 + 0.25 * Math.sin(t * 0.7);
  if (hiker) {
    const dx = hiker[0] - SQUIRREL_ROCK[0];
    const dz = hiker[2] - SQUIRREL_ROCK[2];
    const target = Math.atan2(dx, dz);
    lookYaw = lerp(lookYaw, target, windowW(t, 32.6, 34.6, 0.3));
  }
  const capOn = t >= CAP_FLY.t1;
  const capLand = capOn ? Math.exp(-(t - CAP_FLY.t1) * 5) * Math.sin((t - CAP_FLY.t1) * 25) : 0;
  const startle = windowW(t, 32.7, 33.9, 0.08, 0.3);
  const nibble = t < 32.7 || t > 36 ? Math.max(0, Math.sin(t * 14)) * 0.5 : 0;
  const proud = smoothstep(34.6, 35.0, t) * (1 - smoothstep(53.0, 53.2, t)) + smoothstep(59.4, 59.6, realTime(t));
  return { lookYaw, capOn, capLand, startle, nibble, proud };
}

export { realTime };

/** Stats for the punchline phone screen. */
export const DESCENT = {
  seconds: EV.landPile - EV.pineSlipStart,
  turns: Math.round(Math.abs(THETA_PILE - THETA_LAND) / (Math.PI * 2)),
};
