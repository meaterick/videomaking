import { useMemo } from "react";
import * as THREE from "three";
import { V3 } from "../lib/anim";
import { Face } from "./face";
import { Hand, LIMB_ORDER, Pose, RIG } from "./rig";

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const mat = (color: string, roughness = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

const stripeTexture = (() => {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8fc3ef";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#f4f9ff";
  for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 11, 128);
  g.fillStyle = "#5e93c8";
  for (let x = 14; x < 128; x += 32) g.fillRect(x, 0, 3, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
})();

export const GM = {
  skin: mat("#f0bf98", 0.55),
  skinShine: mat("#f6d2b0", 0.25),
  nose: mat("#eda07f", 0.5),
  pj: new THREE.MeshStandardMaterial({ map: stripeTexture, roughness: 0.8 }),
  pjDark: mat("#4f80b5", 0.8),
  suit: mat("#263250", 0.55),
  shirt: mat("#f7f7f2", 0.6),
  tie: mat("#d7263d", 0.5),
  hair: mat("#2b211c", 0.8),
  eyeWhite: mat("#ffffff", 0.3),
  pupil: mat("#151515", 0.2),
  shine: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  dark: mat("#1c1414", 0.6),
  mouth: mat("#5a1717", 0.6),
  tongue: mat("#e0606d", 0.5),
  teeth: mat("#ffffff", 0.35),
  blush: new THREE.MeshBasicMaterial({ color: "#ff6b6b", transparent: true, opacity: 0, depthWrite: false }),
  sweat: mat("#8fd3ff", 0.1, { transparent: true, opacity: 0.85 }),
  snot: new THREE.MeshPhysicalMaterial({ color: "#cfe9ff", roughness: 0.05, transmission: 0, transparent: true, opacity: 0.45, clearcoat: 1 }),
  toast: mat("#d9a35b", 0.85),
  toastCrust: mat("#9a5a26", 0.9),
};

const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14);
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 18),
  sphereLo: new THREE.SphereGeometry(1, 14, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 10),
  thigh: capsule(0.098, RIG.thigh - 0.06),
  shin: capsule(0.086, RIG.shin - 0.05),
  upperArm: capsule(0.082, RIG.upperArm - 0.06),
  forearm: capsule(0.072, RIG.forearm - 0.05),
  arc: new THREE.TorusGeometry(0.042, 0.011, 6, 18, Math.PI),
  strand: new THREE.TorusGeometry(0.276, 0.009, 5, 24, 1.9),
  hairRing: new THREE.TorusGeometry(0.235, 0.07, 10, 28, Math.PI * 1.25),
};

// ---------------------------------------------------------------------------
type MeshP = { g: THREE.BufferGeometry; m: THREE.Material; p?: V3; r?: V3; s?: V3 | number; shadow?: boolean };
const Mesh: React.FC<MeshP> = ({ g, m, p = [0, 0, 0], r = [0, 0, 0], s = 1, shadow = true }) => (
  <mesh geometry={g} material={m} position={p} rotation={r} scale={typeof s === "number" ? [s, s, s] : s} castShadow={shadow} receiveShadow={shadow} />
);

const OnHead: React.FC<{ yaw: number; pitch: number; r?: number; children: React.ReactNode }> = ({ yaw, pitch, r = RIG.headR, children }) => (
  <group rotation={[-pitch, yaw, 0, "YXZ"]}>
    <group position={[0, 0, r]}>{children}</group>
  </group>
);

const HandMesh: React.FC<{ shape: Hand; side: 1 | -1 }> = ({ shape, side }) => (
  <group position={[0, -0.06, 0.005]}>
    <Mesh g={G.sphere} m={GM.skin} s={shape === "open" ? [0.072, 0.085, 0.04] : [0.068, 0.078, 0.062]} />
    {shape !== "thumb" && <Mesh g={G.sphereLo} m={GM.skin} p={[-0.045 * side, 0.005, 0.035]} s={[0.026, 0.038, 0.026]} r={[0, 0, 0.6 * side]} />}
    {shape === "thumb" && (
      <>
        <Mesh g={G.cyl} m={GM.skin} p={[0, 0, 0.085]} r={[Math.PI / 2, 0, 0]} s={[0.028, 0.11, 0.028]} />
        <Mesh g={G.sphereLo} m={GM.skin} p={[0, 0, 0.14]} s={0.029} />
      </>
    )}
  </group>
);

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------
const Eye: React.FC<{ side: 1 | -1; f: Face; t: number }> = ({ side, f }) => {
  const open = side === 1 ? f.eyeL : f.eyeR;
  const yaw = 0.36 * side;
  const wide = Math.max(1, open);
  if (f.eyeStyle === "happy" || f.eyeStyle === "sleep") {
    return (
      <OnHead yaw={yaw} pitch={0.1} r={RIG.headR + 0.002}>
        <Mesh g={G.arc} m={GM.dark} p={[0, f.eyeStyle === "sleep" ? 0.012 : -0.01, 0.006]} r={[0, 0, f.eyeStyle === "sleep" ? Math.PI : 0]} s={[1.05, 0.9, 1]} shadow={false} />
      </OnHead>
    );
  }
  if (f.eyeStyle === "squeeze") {
    return (
      <OnHead yaw={yaw} pitch={0.1} r={RIG.headR + 0.004}>
        <Mesh g={G.box} m={GM.dark} p={[0.012 * -side, 0.016, 0]} r={[0, 0, -0.5 * side]} s={[0.075, 0.016, 0.012]} shadow={false} />
        <Mesh g={G.box} m={GM.dark} p={[0.012 * -side, -0.016, 0]} r={[0, 0, 0.5 * side]} s={[0.075, 0.016, 0.012]} shadow={false} />
      </OnHead>
    );
  }
  return (
    <OnHead yaw={yaw} pitch={0.1} r={RIG.headR - 0.02}>
      <group scale={[wide, Math.max(0.06, open), 1]}>
        <Mesh g={G.sphere} m={GM.eyeWhite} s={[0.072, 0.088, 0.045]} shadow={false} />
        <group position={[f.look[0] * 0.022, f.look[1] * 0.025, 0.036]} scale={f.pupil / Math.max(1, wide * 0.85)}>
          <Mesh g={G.sphere} m={GM.pupil} s={[0.036, 0.042, 0.018]} shadow={false} />
          <Mesh g={G.sphereLo} m={GM.shine} p={[0.012, 0.015, 0.014]} s={0.011} shadow={false} />
        </group>
      </group>
    </OnHead>
  );
};

const Brow: React.FC<{ side: 1 | -1; f: Face }> = ({ side, f }) => (
  <OnHead yaw={0.33 * side} pitch={0.36 + f.brow * 0.09} r={RIG.headR + 0.004}>
    <Mesh g={G.box} m={GM.hair} r={[0, 0, side * (-f.browTilt * 0.35 + f.brow * 0.06)]} s={[0.1, 0.026, 0.026]} shadow={false} />
  </OnHead>
);

const Mouth: React.FC<{ f: Face; t: number }> = ({ f, t }) => {
  const o = Math.max(0, Math.min(1.2, f.open));
  let w = 0.07;
  let h = 0.012 + o * 0.075;
  let teeth = false;
  let tongue = false;
  switch (f.mouth) {
    case "grin":
      w = 0.11;
      h = 0.035 + o * 0.05;
      teeth = true;
      break;
    case "o":
      w = 0.045;
      h = 0.055 + o * 0.03;
      break;
    case "scream":
      w = 0.085;
      h = 0.1 + o * 0.03 + 0.01 * Math.sin(t * 40);
      tongue = true;
      break;
    case "wavy":
      w = 0.06;
      h = 0.012 + o * 0.06;
      break;
    default:
      break;
  }
  const smileArc = f.mouth === "smile" && o < 0.15;
  return (
    <OnHead yaw={0} pitch={-0.5} r={RIG.headR - 0.012}>
      {smileArc ? (
        <Mesh g={G.arc} m={GM.mouth} r={[0, 0, Math.PI]} p={[0, 0.012, 0.012]} s={[1.0, 0.75, 1]} shadow={false} />
      ) : (
        <group>
          <Mesh g={G.sphere} m={GM.mouth} s={[w, h, 0.02]} shadow={false} />
          {teeth && <Mesh g={G.box} m={GM.teeth} p={[0, h * 0.45, 0.012]} s={[w * 1.4, Math.min(0.025, h * 0.5), 0.01]} shadow={false} />}
          {tongue && <Mesh g={G.sphere} m={GM.tongue} p={[0, -h * 0.5, 0.01]} s={[w * 0.6, h * 0.35, 0.012]} shadow={false} />}
        </group>
      )}
    </OnHead>
  );
};

export type Extras = {
  snot?: number; // snot bubble size 0..1
  dressed?: boolean; // suit jacket + tie over the pyjamas
  tieFlap?: number; // radians the tie flies back
  toast?: boolean; // toast in mouth
};

const Head: React.FC<{ f: Face; t: number; ex: Extras }> = ({ f, t, ex }) => {
  const blushMat = useMemo(() => GM.blush.clone(), []);
  blushMat.opacity = 0.55 * f.blush;
  const snot = ex.snot ?? 0;
  return (
    <group>
      <Mesh g={G.sphere} m={GM.skin} s={[RIG.headR, RIG.headR * 0.98, RIG.headR * 0.95]} />
      <Mesh g={G.sphere} m={GM.skin} p={[0.262, -0.01, -0.01]} s={[0.035, 0.065, 0.05]} />
      <Mesh g={G.sphere} m={GM.skin} p={[-0.262, -0.01, -0.01]} s={[0.035, 0.065, 0.05]} />
      <Mesh g={G.hairRing} m={GM.hair} p={[0, 0.04, -0.015]} r={[Math.PI / 2, 0, -Math.PI * 1.125]} s={[1.02, 1.02, 0.75]} />
      {/* comb-over strands + bed-head tufts */}
      {[0.25, 0.05, -0.15].map((rx, i) => (
        <group key={i} rotation={[rx, 0, 0]}>
          <Mesh g={G.strand} m={GM.hair} r={[0, 0, Math.PI / 2 - 0.95]} />
        </group>
      ))}
      <Mesh g={G.cone} m={GM.hair} p={[0.06, 0.29, -0.1]} r={[-0.5, 0, -0.5]} s={[0.025, 0.12, 0.025]} />
      <Mesh g={G.cone} m={GM.hair} p={[-0.05, 0.28, -0.14]} r={[-0.8, 0, 0.4]} s={[0.022, 0.1, 0.022]} />
      <OnHead yaw={-0.15} pitch={1.0} r={RIG.headR - 0.004}>
        <Mesh g={G.sphere} m={GM.skinShine} s={[0.05, 0.03, 0.01]} shadow={false} />
      </OnHead>
      <Eye side={1} f={f} t={t} />
      <Eye side={-1} f={f} t={t} />
      <Brow side={1} f={f} />
      <Brow side={-1} f={f} />
      <OnHead yaw={0} pitch={-0.12} r={RIG.headR + 0.015}>
        <Mesh g={G.sphere} m={GM.nose} s={[0.052, 0.045, 0.045]} />
      </OnHead>
      {/* snot bubble out of the left nostril */}
      {snot > 0.01 && (
        <OnHead yaw={0.08} pitch={-0.2} r={RIG.headR + 0.05 + snot * 0.11}>
          <mesh geometry={G.sphere} material={GM.snot} scale={0.012 + snot * 0.11} />
        </OnHead>
      )}
      <OnHead yaw={0.13} pitch={-0.3} r={RIG.headR + 0.006}>
        <Mesh g={G.sphere} m={GM.hair} r={[0, 0, -0.25]} s={[0.075, 0.03, 0.028]} shadow={false} />
      </OnHead>
      <OnHead yaw={-0.13} pitch={-0.3} r={RIG.headR + 0.006}>
        <Mesh g={G.sphere} m={GM.hair} r={[0, 0, 0.25]} s={[0.075, 0.03, 0.028]} shadow={false} />
      </OnHead>
      <Mouth f={f} t={t} />
      {ex.toast && (
        <OnHead yaw={0} pitch={-0.5} r={RIG.headR + 0.03}>
          <group rotation={[0.2, 0, 0.12]}>
            <Mesh g={G.box} m={GM.toastCrust} s={[0.13, 0.12, 0.016]} p={[0, -0.04, 0]} />
            <Mesh g={G.box} m={GM.toast} s={[0.115, 0.105, 0.018]} p={[0, -0.04, 0.001]} />
          </group>
        </OnHead>
      )}
      <OnHead yaw={0.62} pitch={-0.16} r={RIG.headR + 0.002}>
        <mesh geometry={G.sphereLo} material={blushMat} scale={[0.055, 0.035, 0.01]} />
      </OnHead>
      <OnHead yaw={-0.62} pitch={-0.16} r={RIG.headR + 0.002}>
        <mesh geometry={G.sphereLo} material={blushMat} scale={[0.055, 0.035, 0.01]} />
      </OnHead>
      {f.sweat > 0.01 && (
        <OnHead yaw={0.95} pitch={0.35 - ((t * 0.7) % 1) * 0.5} r={RIG.headR + 0.01}>
          <Mesh g={G.sphere} m={GM.sweat} s={[0.022 * f.sweat, 0.034 * f.sweat, 0.015]} shadow={false} />
        </OnHead>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------
export type GuyProps = { position: V3; quaternion: THREE.Quaternion; pose: Pose; face: Face; t: number; extras?: Extras };

const Arm: React.FC<{ side: 1 | -1; p: Pose; sleeve: THREE.Material }> = ({ side, p, sleeve }) => {
  const rot = side === 1 ? p.armL : p.armR;
  return (
    <group position={side === 1 ? RIG.shoulderL : RIG.shoulderR} rotation={[rot[0], rot[1], rot[2], LIMB_ORDER]}>
      <Mesh g={G.sphere} m={sleeve} s={0.098} />
      <Mesh g={G.upperArm} m={sleeve} p={[0, -RIG.upperArm / 2, 0]} />
      <group position={[0, -RIG.upperArm, 0]} rotation={[-(side === 1 ? p.elbowL : p.elbowR), 0, 0]}>
        <Mesh g={G.sphereLo} m={sleeve} s={0.08} />
        <Mesh g={G.forearm} m={sleeve} p={[0, -RIG.forearm / 2 + 0.01, 0]} />
        <Mesh g={G.cyl} m={GM.pjDark} p={[0, -RIG.forearm + 0.03, 0]} s={[0.078, 0.04, 0.078]} />
        <group position={[0, -RIG.forearm, 0]} rotation={side === 1 ? p.wristL : p.wristR}>
          <HandMesh shape={side === 1 ? p.handL : p.handR} side={side} />
        </group>
      </group>
    </group>
  );
};

const Leg: React.FC<{ side: 1 | -1; p: Pose }> = ({ side, p }) => {
  const rot = side === 1 ? p.legL : p.legR;
  return (
    <group position={side === 1 ? RIG.hipL : RIG.hipR} rotation={[rot[0], rot[1], rot[2], LIMB_ORDER]}>
      <Mesh g={G.thigh} m={GM.pj} p={[0, -RIG.thigh / 2, 0]} />
      <group position={[0, -RIG.thigh, 0]} rotation={[side === 1 ? p.kneeL : p.kneeR, 0, 0]}>
        <Mesh g={G.sphereLo} m={GM.pj} s={0.09} />
        <Mesh g={G.shin} m={GM.pj} p={[0, -RIG.shin / 2, 0]} />
        <Mesh g={G.cyl} m={GM.pjDark} p={[0, -RIG.shin + 0.04, 0]} s={[0.092, 0.04, 0.092]} />
        <group position={[0, -RIG.shin, 0]} rotation={[side === 1 ? p.footL : p.footR, 0, 0]}>
          {/* bare feet */}
          <Mesh g={G.sphere} m={GM.skin} p={[0, -0.03, 0.06]} s={[0.075, 0.055, 0.14]} />
          {[-0.04, -0.013, 0.013, 0.04].map((x, i) => (
            <Mesh key={i} g={G.sphereLo} m={GM.skin} p={[x, -0.03, 0.19]} s={0.022} />
          ))}
        </group>
      </group>
    </group>
  );
};

export const Guy: React.FC<GuyProps> = ({ position, quaternion, pose: p, face: f, t, extras = {} }) => {
  const top = extras.dressed ? GM.suit : GM.pj;
  return (
    <group position={position} quaternion={quaternion}>
      <group rotation={p.lean}>
        <group position={RIG.pelvis} rotation={p.pelvis}>
          <Mesh g={G.sphere} m={GM.pj} p={[0, 0.02, 0]} s={[0.26, 0.17, 0.22]} />
          <Leg side={1} p={p} />
          <Leg side={-1} p={p} />
          <group position={RIG.spine} rotation={p.spine}>
            <Mesh g={G.sphere} m={top} p={[0, 0.16, 0.035]} s={[0.3, 0.29, 0.28]} />
            {!extras.dressed && (
              <>
                {[0.24, 0.12, 0.0].map((y, i) => (
                  <Mesh key={i} g={G.sphereLo} m={GM.shirt} p={[0, y, 0.31]} s={[0.018, 0.018, 0.01]} shadow={false} />
                ))}
              </>
            )}
            <group position={RIG.chest} rotation={p.chest}>
              <Mesh g={G.sphere} m={top} p={[0, 0.05, 0]} s={[0.3, 0.23, 0.24]} />
              {/* collar */}
              <Mesh g={G.cyl} m={extras.dressed ? GM.shirt : GM.pjDark} p={[0, 0.25, 0.0]} s={[0.12, 0.05, 0.11]} />
              {extras.dressed && (
                <group position={[0, 0.22, 0.12]} rotation={[-(extras.tieFlap ?? 0), 0, 0]}>
                  <Mesh g={G.box} m={GM.tie} p={[0, 0, 0.02]} s={[0.05, 0.04, 0.03]} />
                  <Mesh g={G.box} m={GM.tie} p={[0, -0.13, 0.03]} r={[0.05, 0, 0]} s={[0.06, 0.24, 0.012]} />
                </group>
              )}
              <group position={RIG.neck} rotation={p.neck}>
                <Mesh g={G.cyl} m={GM.skin} s={[0.09, 0.14, 0.09]} />
                <group position={RIG.head}>
                  <Head f={f} t={t} ex={extras} />
                </group>
              </group>
              <Arm side={1} p={p} sleeve={top} />
              <Arm side={-1} p={p} sleeve={top} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
