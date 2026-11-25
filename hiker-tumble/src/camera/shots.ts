import { hikerFK, hikerState, IMPACTS, ROCK_TOP, SQUIRREL_ROCK } from "../character/performance";
import { add3, easeInOut, easeOut, invLerp, kf, kf3, lerp, lerp3, noise1, smoothstep, V3 } from "../lib/anim";
import { realTime, shotAt, ShotId, worldTime } from "../timeline";
import { heightAt, SUMMIT_H, TRAILHEAD_X } from "../world/terrain";

export type Cam = {
  shot: ShotId;
  pos: V3;
  target: V3;
  fov: number;
  roll: number;
  shadowFocus: V3;
  shadowSize: number;
};

const hp = (tw: number) => hikerState(tw).pos;
/** Hiker position smoothed over a short window (kills rolling jitter). */
const hpSmooth = (tw: number, win = 0.25, n = 6): V3 => {
  let acc: V3 = [0, 0, 0];
  for (let i = 0; i < n; i++) acc = add3(acc, hp(tw - (win * i) / (n - 1)));
  return [acc[0] / n, acc[1] / n, acc[2] / n];
};
const aboveGround = (p: V3, min: number): V3 => [p[0], Math.max(p[1], heightAt(p[0], p[2]) + min), p[2]];

const Hs = SUMMIT_H;
const SQ_TOP = SQUIRREL_ROCK[1] + ROCK_TOP;

/** Camera shake from impacts (real time). */
function shake(real: number): { off: V3; roll: number } {
  let amp = 0;
  for (const imp of IMPACTS) {
    const r = realTime(imp.t);
    if (real >= r && real < r + 0.6) amp += imp.strength * Math.exp(-(real - r) * 7) * 0.12;
  }
  // landing in the leaf pile & phone bonk
  for (const [r, s] of [
    [realTime(39.3), 0.25],
    [realTime(48.8), 0.05],
  ] as const) {
    if (real >= r && real < r + 0.8) amp += s * Math.exp(-(real - r) * 6);
  }
  if (amp < 1e-4) return { off: [0, 0, 0], roll: 0 };
  return {
    off: [noise1(real * 31, 1) * amp, noise1(real * 29, 2) * amp, noise1(real * 33, 3) * amp],
    roll: noise1(real * 23, 4) * amp * 0.15,
  };
}

export function cameraAt(real: number): Cam {
  const shot = shotAt(real).id;
  const tw = worldTime(real);
  let pos: V3;
  let target: V3;
  let fov = 38;
  let shadowFocus: V3 = hp(tw);
  let shadowSize = 16;

  switch (shot) {
    case "establish": {
      const u = easeInOut(invLerp(0, 5.6, real));
      pos = lerp3([168, 74, 168], [128, 66, 126], u);
      target = lerp3([36, 40, 0], [24, 45, 0], u);
      fov = 40;
      shadowFocus = [30, 38, 0];
      shadowSize = 110;
      break;
    }
    case "climb": {
      const h = hp(tw);
      target = [h[0] - 0.3, h[1] + 0.45, 0];
      pos = aboveGround([h[0] - 3.7, h[1] + 0.75, 3.7], 0.8);
      fov = 34;
      shadowSize = 12;
      break;
    }
    case "summit": {
      const arrivePos: V3 = [-1.1, Hs + 1.45, 2.6];
      const arriveTarget: V3 = [3.0, Hs + 1.05, 0];
      const heroPos = lerp3([1.3, Hs + 0.55, 3.45], [1.25, Hs + 0.6, 3.0], invLerp(12.8, 15.2, real));
      const heroTarget: V3 = [1.15, Hs + 1.42, 0];
      const sidePos: V3 = [2.8, Hs + 1.6, 3.5];
      const sideTarget: V3 = [1.0, Hs + 1.35, 0];
      if (real < 12.2) {
        pos = arrivePos;
        const h = hp(tw);
        target = lerp3(arriveTarget, [h[0], h[1] + 0.3, 0], smoothstep(11.4, 12.1, real));
      } else if (real < 15.2) {
        const u = easeInOut(invLerp(12.2, 12.9, real));
        const h = hp(tw);
        pos = lerp3(arrivePos, heroPos, u);
        target = lerp3([h[0], h[1] + 0.3, 0], heroTarget, u);
      } else {
        const u = easeInOut(invLerp(15.2, 16.2, real));
        pos = lerp3(heroPos, sidePos, u);
        target = lerp3(heroTarget, sideTarget, u);
      }
      fov = 40;
      shadowFocus = [1, Hs, 0];
      shadowSize = 9;
      break;
    }
    case "selfie": {
      const fk = hikerFK(tw);
      const away = fk.handR.clone().sub(fk.head).normalize();
      const p = fk.handR.clone().add(away.multiplyScalar(0.36));
      const jitter = noise1(real * 3, 9) * 0.01;
      pos = [p.x + jitter, p.y + jitter, p.z];
      target = [fk.head.x, fk.head.y - 0.08, fk.head.z];
      fov = 66;
      shadowFocus = [1.5, Hs, 0];
      shadowSize = 9;
      break;
    }
    case "boot": {
      const pine: V3 = [2.74, Hs, -0.11];
      const u = invLerp(21.4, 23.0, real);
      pos = lerp3([pine[0] + 0.45, Hs + 0.24, pine[2] - 1.05], [pine[0] + 0.35, Hs + 0.2, pine[2] - 0.85], u);
      target = [pine[0] - 0.12, Hs + 0.13, pine[2] + 0.05];
      fov = 42;
      shadowFocus = [2.2, Hs, 0];
      shadowSize = 6;
      break;
    }
    case "slip": {
      const base: V3 = [2.4, Hs + 1.3, 6.4];
      const baseT: V3 = [2.95, Hs + 0.95, 0];
      if (real < 24.6) {
        pos = base;
        target = baseT;
      } else if (real < 25.9) {
        // slow dolly-in during the freeze frame
        const u = easeOut(invLerp(24.6, 25.9, real));
        pos = lerp3(base, [2.75, Hs + 1.35, 5.2], u);
        target = baseT;
      } else {
        const h = hpSmooth(tw, 0.15, 4);
        const u = easeInOut(invLerp(25.9, 26.5, real));
        pos = lerp3([2.75, Hs + 1.35, 5.2], [h[0] - 1.2, h[1] + 2.2, 7.4], u);
        target = lerp3(baseT, [h[0] + 0.4, h[1], 0], u);
      }
      fov = 40;
      shadowFocus = real < 25.9 ? [3, Hs, 0] : hp(tw);
      shadowSize = 12;
      break;
    }
    case "rollSide": {
      const h = hpSmooth(tw, 0.3, 6);
      const lag = hpSmooth(tw - 0.12, 0.4, 6);
      target = [h[0] + 1.0, h[1] + 0.15, 0];
      pos = aboveGround([lag[0] + 2.0, lag[1] + 2.3, 7.2], 1.4);
      fov = 40;
      shadowSize = 22;
      break;
    }
    case "rollFront": {
      const camX = 68.5;
      pos = [camX, heightAt(camX, 6.5) + 5.2, 6.5];
      const h = hpSmooth(tw, 0.12, 4);
      target = [h[0], h[1] + 0.1, h[2]];
      fov = 32;
      shadowFocus = [58, heightAt(58, 0), 0];
      shadowSize = 24;
      break;
    }
    case "squirrel": {
      const u = smoothstep(35.0, 36.2, real);
      pos = aboveGround(lerp3([78.3, SQ_TOP + 0.5, 7.6], [78.6, SQ_TOP + 0.42, 7.05], u), 0.32);
      target = lerp3([79.25, SQ_TOP + 0.2, 4.6], [79.05, SQ_TOP + 0.24, 5.6], u);
      fov = 38;
      shadowFocus = [78, SQ_TOP, 3];
      shadowSize = 16;
      break;
    }
    case "launch": {
      const u = invLerp(37.2, 41.2, real);
      const h = hpSmooth(tw, 0.2, 5);
      // follow the roll, swing under him for the flight, settle on the leaf pile
      const off = kf3(real, [
        [37.2, [-1.5, 2.2, 8.5]],
        [38.4, [-2.5, 0.6, 9.5]],
        [39.4, [-4.5, -2.5, 10]],
        [40.0, [-6, -3.0, 10]],
      ]);
      const follow = aboveGround([h[0] + off[0], h[1] + off[1], off[2]], 1.2);
      const settle = smoothstep(39.9, 40.5, real);
      pos = lerp3(follow, [134.5, 2.6, 9.5], settle);
      target = lerp3([h[0] + 1, h[1] + 0.3, 0], [TRAILHEAD_X, 1.2, 0], settle);
      fov = 46;
      shadowFocus = [lerp(112, TRAILHEAD_X, u), 3, 0];
      shadowSize = 36;
      break;
    }
    case "landing": {
      const u = easeInOut(invLerp(41.2, 49.6, real));
      pos = lerp3([138.0, 1.8, 7.1], [139.4, 1.62, 5.0], u);
      target = lerp3([142.4, 1.05, -0.2], [142.1, 1.3, 0.05], u);
      fov = kf(real, [[43.2, 38], [43.6, 33]], easeOut);
      shadowFocus = [TRAILHEAD_X, 0, 0];
      shadowSize = 12;
      break;
    }
    case "phone": {
      pos = [139.9, 1.72, 3.95];
      target = [142.05, 1.38, 0.12];
      fov = kf(real, [[52.3, 34], [52.9, 31]], easeOut);
      shadowFocus = [TRAILHEAD_X, 0, 0];
      shadowSize = 10;
      break;
    }
    case "ending":
    default: {
      const u = easeInOut(invLerp(55.6, 62, real));
      pos = kf3(
        u,
        [
          [0, [78.35, SQ_TOP + 0.62, 7.25]],
          [0.35, [76.5, SQ_TOP + 2.2, 10.5]],
          [1, [160, 74, 150]],
        ],
        (x) => x,
      );
      pos = aboveGround(pos, 0.1 + 1.0 * smoothstep(0.02, 0.2, u)); // keep clear of the rising slope
      target = kf3(
        u,
        [
          [0, [79.0, SQ_TOP + 0.3, 5.6]],
          [0.35, [78.8, SQ_TOP + 0.3, 5.0]],
          [1, [22, 42, 0]],
        ],
        (x) => x,
      );
      fov = lerp(36, 42, u);
      shadowFocus = lerp3([78, SQ_TOP, 4], [40, 30, 0], u);
      shadowSize = lerp(14, 110, u);
      break;
    }
  }
  const sh = shake(real);
  return { shot, pos: add3(pos, sh.off), target, fov, roll: sh.roll, shadowFocus, shadowSize };
}
