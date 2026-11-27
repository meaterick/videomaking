import * as THREE from "three";
import { guyFK, guyState, PHONE_ON_BED } from "../character/performance";
import { add3, easeInOut, easeOut, invLerp, kf, lerp, lerp3, noise1, smoothstep, V3 } from "../lib/anim";
import { EV, shotAt, ShotId } from "../timeline";

export type Cam = { shot: ShotId; pos: V3; target: V3; up: V3; fov: number };

const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
const hand = (t: number, s: number) => noise1(t * 1.3, s) * 0.006; // subtle handheld drift

/** Phone lying beside the pillow, filmed from straight above, phone upright in frame. */
function phoneCam(t: number, start: number, height: number, fov: number): Omit<Cam, "shot"> {
  const [px, py, pz] = PHONE_ON_BED.pos;
  const yaw = PHONE_ON_BED.yaw;
  const up: V3 = [-Math.sin(yaw), 0, -Math.cos(yaw)];
  const push = lerp(height, height * 0.88, easeInOut(invLerp(start, start + 1.6, t)));
  return { pos: [px + hand(t, 1), py + push, pz + hand(t, 2)], target: [px, py, pz], up, fov };
}

const TOP = (t: number, start: number, y = 4.0, zoom = 0): Omit<Cam, "shot"> => {
  const drift = Math.sin((t - start) * 0.6) * 0.04;
  return { pos: [0.2 + drift, y - zoom, -0.45], target: [0.2 + drift, 0.55, -1.08], up: [Math.sin(drift) * 0.5, 0, -1], fov: 46 };
};

function faceCam(t: number, zoom: number): Omit<Cam, "shot"> {
  const head = guyFK(Math.min(t, 23.9)).head;
  const target: V3 = [head.x + 0.02, head.y + 0.22, head.z - 0.02];
  const pos: V3 = [head.x + 0.7, head.y + 1.35, head.z + 0.62];
  return { pos, target, up: [0, 0.3, -1], fov: 30 - zoom };
}

function shake(t: number): V3 {
  const chaos = (t >= EV.chaos && t < EV.bubblePop ? 1 : 0) + (t >= EV.giantLand && t < EV.giantLand + 0.5 ? 2.5 * Math.exp(-(t - EV.giantLand) * 6) : 0);
  if (!chaos) return [0, 0, 0];
  const a = 0.012 * chaos;
  return [noise1(t * 37, 1) * a, noise1(t * 41, 2) * a, noise1(t * 43, 3) * a];
}

export function cameraAt(t: number): Cam {
  const shot = shotAt(t).id;
  let c: Omit<Cam, "shot">;
  switch (shot) {
    case "phoneHook":
      c = phoneCam(t, 0, 0.4, 32);
      break;
    case "topSlap":
      c = TOP(t, 1.6);
      break;
    case "topPillow":
      c = TOP(t, 3.2, 4.0, 0.25 * easeOut(invLerp(3.2, 4.8, t)));
      break;
    case "sideDive":
      c = { pos: [1.45, 1.95, -0.35], target: [0.05, 0.85, -1.62], up: [0, 1, 0], fov: 40 };
      break;
    case "wideClock":
      c = { pos: lerp3([1.75, 1.7, 1.75], [1.55, 1.75, 1.45], easeOut(invLerp(6.4, 8.0, t))), target: [-0.75, 0.95, -1.0], up: [0, 1, 0], fov: 54 };
      break;
    case "headRooster":
      c = { pos: [0.38, 1.6, -0.25], target: [-0.12, 1.1, -1.95], up: [0, 1, 0], fov: 46 };
      break;
    case "faceBubble":
      c = faceCam(t, kf(t, [[EV.eyesOpen - 0.05, 0], [EV.eyesOpen + 0.12, 6]], easeOut));
      break;
    case "phoneLate":
      c = phoneCam(t, 12.0, kf(t, [[12.3, 0.34], [12.45, 0.26]], easeOut), 32);
      break;
    case "topJump":
      c = TOP(t, 12.8, 4.0);
      break;
    case "run": {
      const g = guyState(t).pos;
      const follow = smoothstep(13.6, 15.6, t);
      c = {
        pos: [-1.05, 1.6, 2.95],
        target: lerp3([1.05, 1.05, -0.55], [g[0] - 0.1, 1.1, g[2] - 0.1], follow),
        up: [0, 1, 0],
        fov: 50,
      };
      break;
    }
    case "phonePov": {
      const fk = guyFK(t);
      const phone = fk.handR.clone();
      const eye = fk.head.clone().add(fk.handR.clone().sub(fk.head).normalize().multiplyScalar(0.2));
      c = { pos: v3(eye), target: [phone.x, phone.y + 0.05, phone.z], up: [0, 1, 0], fov: 30 };
      break;
    }
    case "faceDoor": {
      const head = guyFK(t).head;
      const zoom = kf(t, [[17.0, 0], [18.3, 4]], easeInOut);
      c = { pos: [head.x - 1.7, head.y + 0.08, head.z + 0.3], target: [head.x, head.y - 0.12, head.z], up: [0, 1, 0], fov: 32 - zoom };
      break;
    }
    case "topBack":
      c = TOP(t, 18.4, 4.0, 0.6 * easeInOut(invLerp(18.6, 22.4, t)));
      break;
    case "phoneEnd":
      c = phoneCam(t, 0, 0.4, 32);
      break;
    case "faceEnd":
    default:
      c = faceCam(t, kf(t, [[EV.despair - 0.02, 0], [EV.despair + 0.15, 5]], easeOut));
      break;
  }
  return { shot, ...c, pos: add3(c.pos, shake(t)) };
}
