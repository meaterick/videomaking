import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { V3 } from "../lib/anim";
import { Face } from "./face";
import { Hand, LIMB_ORDER, Pose, RIG } from "./rig";

// ---------------------------------------------------------------------------
// Shared materials & geometries (created once per page)
// ---------------------------------------------------------------------------
const mat = (color: string, roughness = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

export const M = {
  skin: mat("#f0bf98", 0.55),
  skinShine: mat("#f6d2b0", 0.25),
  nose: mat("#eda07f", 0.5),
  jacket: mat("#1d9bd8", 0.5),
  jacketDark: mat("#0f5f8a", 0.6),
  trim: mat("#ffd23f", 0.45),
  pants: mat("#3a3f48", 0.85),
  boot: mat("#7b4a28", 0.7),
  sole: mat("#262626", 0.9),
  lace: mat("#d7263d", 0.6),
  pack: mat("#2b3656", 0.7),
  packDark: mat("#1b223a", 0.8),
  mat: mat("#ef7d2d", 0.6),
  bottle: mat("#7fd49a", 0.25, { transparent: true, opacity: 0.92 }),
  bottleCap: mat("#ffffff", 0.4),
  cap: mat("#e63946", 0.55),
  capLogo: mat("#ffffff", 0.5),
  towel: mat("#fbfbf6", 0.9),
  towelStripe: mat("#2a9d8f", 0.8),
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
  pole: mat("#c9ced6", 0.3, { metalness: 0.6 }),
  poleGrip: mat("#202020", 0.8),
  phone: mat("#1b1b22", 0.3, { metalness: 0.3 }),
  phoneScreen: new THREE.MeshBasicMaterial({ color: "#7fb8ff" }),
  star: new THREE.MeshBasicMaterial({ color: "#ffd84d" }),
};

const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14);
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 18),
  sphereLo: new THREE.SphereGeometry(1, 14, 10),
  hemi: new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  thigh: capsule(0.098, RIG.thigh - 0.06),
  shin: capsule(0.086, RIG.shin - 0.05),
  upperArm: capsule(0.082, RIG.upperArm - 0.06),
  forearm: capsule(0.072, RIG.forearm - 0.05),
  boot: new RoundedBoxGeometry(0.18, 0.14, 0.31, 3, 0.05),
  sole: new RoundedBoxGeometry(0.19, 0.04, 0.33, 2, 0.015),
  pack: new RoundedBoxGeometry(0.5, 0.58, 0.27, 4, 0.08),
  packPocket: new RoundedBoxGeometry(0.38, 0.24, 0.1, 3, 0.04),
  phone: new RoundedBoxGeometry(0.085, 0.165, 0.014, 2, 0.008),
  arc: new THREE.TorusGeometry(0.042, 0.011, 6, 18, Math.PI),
  ring: new THREE.TorusGeometry(0.04, 0.008, 6, 22),
  ringSmall: new THREE.TorusGeometry(0.02, 0.008, 6, 16),
  strand: new THREE.TorusGeometry(0.276, 0.009, 5, 24, 1.9),
  hairRing: new THREE.TorusGeometry(0.235, 0.07, 10, 28, Math.PI * 1.25),
  towel: new THREE.TorusGeometry(0.17, 0.055, 10, 24),
  strap: new THREE.TorusGeometry(0.2, 0.024, 6, 18, Math.PI * 0.95),
  star: (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.07 : 0.03;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  })(),
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
type MeshP = {
  g: THREE.BufferGeometry;
  m: THREE.Material;
  p?: V3;
  r?: V3;
  s?: V3 | number;
  shadow?: boolean;
};
const Mesh: React.FC<MeshP> = ({ g, m, p = [0, 0, 0], r = [0, 0, 0], s = 1, shadow = true }) => (
  <mesh
    geometry={g}
    material={m}
    position={p}
    rotation={r}
    scale={typeof s === "number" ? [s, s, s] : s}
    castShadow={shadow}
    receiveShadow={shadow}
  />
);

/** Places children on the head sphere surface at (yaw, pitch). */
const OnHead: React.FC<{ yaw: number; pitch: number; r?: number; children: React.ReactNode }> = ({
  yaw,
  pitch,
  r = RIG.headR,
  children,
}) => (
  <group rotation={[-pitch, yaw, 0, "YXZ"]}>
    <group position={[0, 0, r]}>{children}</group>
  </group>
);

export const Pole: React.FC<{ length?: number }> = ({ length = 1.18 }) => (
  <group>
    <Mesh g={G.cyl} m={M.poleGrip} p={[0, -0.02, 0]} s={[0.028, 0.15, 0.028]} />
    <Mesh g={G.cyl} m={M.pole} p={[0, -length / 2, 0]} s={[0.012, length, 0.012]} />
    <Mesh g={G.cyl} m={M.poleGrip} p={[0, -length + 0.12, 0]} s={[0.045, 0.01, 0.045]} />
  </group>
);

export const Phone: React.FC<{ glow?: number }> = ({ glow = 0.6 }) => (
  <group>
    <Mesh g={G.phone} m={M.phone} />
    <mesh position={[0, 0, 0.0075]} geometry={G.box} scale={[0.074, 0.15, 0.001]}>
      <meshBasicMaterial color={new THREE.Color("#0b1a33").lerp(new THREE.Color("#8cc4ff"), glow)} />
    </mesh>
    <Mesh g={G.sphereLo} m={M.dark} p={[0.022, 0.06, -0.009]} s={[0.012, 0.012, 0.005]} />
  </group>
);

export const Cap: React.FC = () => (
  <group>
    <Mesh g={G.hemi} m={M.cap} p={[0, 0.02, -0.01]} r={[-0.12, 0, 0]} s={[0.292, 0.285, 0.302]} />
    <Mesh g={G.cyl} m={M.cap} p={[0, 0.115, 0.2]} r={[0.06, 0, 0]} s={[0.19, 0.02, 0.15]} />
    <Mesh g={G.cyl} m={M.capLogo} p={[0, 0.15, 0.262]} r={[Math.PI / 2 - 0.55, 0, 0]} s={[0.05, 0.006, 0.05]} />
    <Mesh g={G.sphereLo} m={M.cap} p={[0, 0.3, -0.045]} s={0.025} />
  </group>
);

const HandMesh: React.FC<{ shape: Hand; side: 1 | -1 }> = ({ shape, side }) => {
  const palm = shape === "open" ? ([0.072, 0.085, 0.04] as V3) : ([0.068, 0.078, 0.062] as V3);
  return (
    <group position={[0, -0.06, 0.005]}>
      <Mesh g={G.sphere} m={M.skin} s={palm} />
      {/* thumb */}
      {shape !== "thumb" && (
        <Mesh g={G.sphereLo} m={M.skin} p={[-0.045 * side, 0.005, 0.035]} s={[0.026, 0.038, 0.026]} r={[0, 0, 0.6 * side]} />
      )}
      {shape === "v" && (
        <>
          <Mesh g={G.cyl} m={M.skin} p={[0.022, -0.09, 0.0]} r={[0, 0, 0.28]} s={[0.019, 0.1, 0.019]} />
          <Mesh g={G.cyl} m={M.skin} p={[-0.022, -0.09, 0.0]} r={[0, 0, -0.28]} s={[0.019, 0.1, 0.019]} />
          <Mesh g={G.sphereLo} m={M.skin} p={[0.036, -0.14, 0]} s={0.02} />
          <Mesh g={G.sphereLo} m={M.skin} p={[-0.036, -0.14, 0]} s={0.02} />
        </>
      )}
      {shape === "thumb" && (
        <>
          <Mesh g={G.cyl} m={M.skin} p={[0, 0.0, 0.085]} r={[Math.PI / 2, 0, 0]} s={[0.028, 0.11, 0.028]} />
          <Mesh g={G.sphereLo} m={M.skin} p={[0, 0, 0.14]} s={0.029} />
        </>
      )}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------
const Eye: React.FC<{ side: 1 | -1; f: Face; t: number }> = ({ side, f, t }) => {
  const open = side === 1 ? f.eyeL : f.eyeR;
  const yaw = 0.36 * side;
  const wide = Math.max(1, open);
  if (f.eyeStyle === "happy") {
    return (
      <OnHead yaw={yaw} pitch={0.1} r={RIG.headR + 0.002}>
        <Mesh g={G.arc} m={M.dark} p={[0, -0.01, 0.006]} s={[1.05, 1.1, 1]} shadow={false} />
      </OnHead>
    );
  }
  if (f.eyeStyle === "squeeze") {
    // ">" "<" shapes pointing at the nose
    return (
      <OnHead yaw={yaw} pitch={0.1} r={RIG.headR + 0.004}>
        <Mesh g={G.box} m={M.dark} p={[0.012 * -side, 0.016, 0]} r={[0, 0, -0.5 * side]} s={[0.075, 0.016, 0.012]} shadow={false} />
        <Mesh g={G.box} m={M.dark} p={[0.012 * -side, -0.016, 0]} r={[0, 0, 0.5 * side]} s={[0.075, 0.016, 0.012]} shadow={false} />
      </OnHead>
    );
  }
  return (
    <OnHead yaw={yaw} pitch={0.1} r={RIG.headR - 0.02}>
      <group scale={[wide, Math.max(0.06, open), 1]}>
        <Mesh g={G.sphere} m={M.eyeWhite} s={[0.072, 0.088, 0.045]} shadow={false} />
        {f.eyeStyle === "dizzy" ? (
          <group position={[0, 0, 0.043]} rotation={[0, 0, t * 9 * side]}>
            <Mesh g={G.ring} m={M.dark} s={[1, 1, 0.6]} shadow={false} />
            <Mesh g={G.ringSmall} m={M.dark} p={[0.006, 0.004, 0]} s={[1, 1, 0.6]} shadow={false} />
          </group>
        ) : (
          <group position={[f.look[0] * 0.022, f.look[1] * 0.025, 0.036]} scale={f.pupil / Math.max(1, wide * 0.85)}>
            <Mesh g={G.sphere} m={M.pupil} s={[0.036, 0.042, 0.018]} shadow={false} />
            <Mesh g={G.sphereLo} m={M.shine} p={[0.012, 0.015, 0.014]} s={0.011} shadow={false} />
          </group>
        )}
      </group>
    </OnHead>
  );
};

const Brow: React.FC<{ side: 1 | -1; f: Face }> = ({ side, f }) => (
  <OnHead yaw={0.33 * side} pitch={0.36 + f.brow * 0.09} r={RIG.headR + 0.004}>
    <Mesh
      g={G.box}
      m={M.hair}
      r={[0, 0, side * (-f.browTilt * 0.35 + f.brow * 0.06)]}
      s={[0.1, 0.026, 0.026]}
      shadow={false}
    />
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
    case "pant":
      w = 0.065;
      h = 0.03 + 0.03 * (0.5 + 0.5 * Math.sin(t * 13)) + o * 0.04;
      tongue = true;
      break;
    case "flat":
      w = 0.07;
      h = 0.01 + o * 0.06;
      break;
    case "wavy":
      w = 0.06;
      h = 0.012 + o * 0.06;
      break;
    case "smile":
      w = 0.075;
      h = 0.012 + o * 0.07;
      break;
  }
  const showSmileArc = (f.mouth === "smile" || f.mouth === "grin") && o < 0.15;
  return (
    <OnHead yaw={0} pitch={-0.5} r={RIG.headR - 0.012}>
      {showSmileArc && f.mouth === "smile" ? (
        <Mesh g={G.arc} m={M.mouth} r={[0, 0, Math.PI]} p={[0, 0.012, 0.012]} s={[1.0, 0.75, 1]} shadow={false} />
      ) : (
        <group>
          <Mesh g={G.sphere} m={M.mouth} s={[w, h, 0.02]} shadow={false} />
          {teeth && <Mesh g={G.box} m={M.teeth} p={[0, h * 0.45, 0.012]} s={[w * 1.4, Math.min(0.025, h * 0.5), 0.01]} shadow={false} />}
          {tongue && <Mesh g={G.sphere} m={M.tongue} p={[0, -h * 0.5, 0.01]} s={[w * 0.6, h * 0.35, 0.012]} shadow={false} />}
        </group>
      )}
    </OnHead>
  );
};

const HikerHead: React.FC<{ f: Face; t: number; capOn: boolean; stars: number }> = ({ f, t, capOn, stars }) => {
  const blushMat = useMemo(() => {
    const m = M.blush.clone();
    return m;
  }, []);
  blushMat.opacity = 0.55 * f.blush;
  return (
    <group>
      <Mesh g={G.sphere} m={M.skin} s={[RIG.headR, RIG.headR * 0.98, RIG.headR * 0.95]} />
      {/* ears */}
      <Mesh g={G.sphere} m={M.skin} p={[0.262, -0.01, -0.01]} s={[0.035, 0.065, 0.05]} />
      <Mesh g={G.sphere} m={M.skin} p={[-0.262, -0.01, -0.01]} s={[0.035, 0.065, 0.05]} />
      {/* side & back hair ring + the famous comb-over */}
      <Mesh g={G.hairRing} m={M.hair} p={[0, 0.04, -0.015]} r={[Math.PI / 2, 0, -Math.PI * 1.125]} s={[1.02, 1.02, 0.75]} />
      {!capOn && (
        <group>
          <group rotation={[0.25, 0, 0]}>
            <Mesh g={G.strand} m={M.hair} r={[0, 0, Math.PI / 2 - 0.95]} />
          </group>
          <group rotation={[0.05, 0, 0]}>
            <Mesh g={G.strand} m={M.hair} r={[0, 0, Math.PI / 2 - 0.95]} />
          </group>
          <group rotation={[-0.15, 0, 0]}>
            <Mesh g={G.strand} m={M.hair} r={[0, 0, Math.PI / 2 - 0.95]} />
          </group>
          {/* shiny bald spot */}
          <OnHead yaw={-0.15} pitch={1.0} r={RIG.headR - 0.004}>
            <Mesh g={G.sphere} m={M.skinShine} s={[0.05, 0.03, 0.01]} shadow={false} />
          </OnHead>
        </group>
      )}
      <Eye side={1} f={f} t={t} />
      <Eye side={-1} f={f} t={t} />
      <Brow side={1} f={f} />
      <Brow side={-1} f={f} />
      {/* nose */}
      <OnHead yaw={0} pitch={-0.12} r={RIG.headR + 0.015}>
        <Mesh g={G.sphere} m={M.nose} s={[0.052, 0.045, 0.045]} />
      </OnHead>
      {/* mustache */}
      <OnHead yaw={0.13} pitch={-0.3} r={RIG.headR + 0.006}>
        <Mesh g={G.sphere} m={M.hair} r={[0, 0, -0.25]} s={[0.075, 0.03, 0.028]} shadow={false} />
      </OnHead>
      <OnHead yaw={-0.13} pitch={-0.3} r={RIG.headR + 0.006}>
        <Mesh g={G.sphere} m={M.hair} r={[0, 0, 0.25]} s={[0.075, 0.03, 0.028]} shadow={false} />
      </OnHead>
      <Mouth f={f} t={t} />
      {/* cheeks */}
      <OnHead yaw={0.62} pitch={-0.16} r={RIG.headR + 0.002}>
        <mesh geometry={G.sphereLo} material={blushMat} scale={[0.055, 0.035, 0.01]} />
      </OnHead>
      <OnHead yaw={-0.62} pitch={-0.16} r={RIG.headR + 0.002}>
        <mesh geometry={G.sphereLo} material={blushMat} scale={[0.055, 0.035, 0.01]} />
      </OnHead>
      {/* sweat drops */}
      {f.sweat > 0.01 && (
        <>
          <OnHead yaw={0.95} pitch={0.35 - ((t * 0.7) % 1) * 0.5} r={RIG.headR + 0.01}>
            <Mesh g={G.sphere} m={M.sweat} s={[0.022 * f.sweat, 0.034 * f.sweat, 0.015]} shadow={false} />
          </OnHead>
          <OnHead yaw={-1.05} pitch={0.25 - ((t * 0.55 + 0.4) % 1) * 0.5} r={RIG.headR + 0.01}>
            <Mesh g={G.sphere} m={M.sweat} s={[0.018 * f.sweat, 0.028 * f.sweat, 0.012]} shadow={false} />
          </OnHead>
        </>
      )}
      {capOn && <Cap />}
      {/* dizzy stars orbiting */}
      {stars > 0.01 &&
        [0, 1, 2].map((i) => {
          const a = t * 4.2 + (i * Math.PI * 2) / 3;
          return (
            <group key={i} position={[Math.cos(a) * 0.42, 0.4 + 0.05 * Math.sin(a * 2), Math.sin(a) * 0.42]} scale={stars * 1.9}>
              <mesh geometry={G.star} material={M.star} rotation={[0, -a, 0]} />
            </group>
          );
        })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Full body
// ---------------------------------------------------------------------------
export type HikerProps = {
  position: V3;
  quaternion: THREE.Quaternion;
  pose: Pose;
  face: Face;
  t: number;
  capOn: boolean;
  phoneInHand: boolean;
  polesInHands: boolean;
  stars?: number;
  /** Camera is the phone (selfie POV): hide the right forearm & phone. */
  selfieView?: boolean;
};

const Arm: React.FC<{ side: 1 | -1; p: Pose; holdPole: boolean; holdPhone: boolean; hideHand?: boolean }> = ({
  side,
  p,
  holdPole,
  holdPhone,
  hideHand = false,
}) => {
  const rot = side === 1 ? p.armL : p.armR;
  const elbow = side === 1 ? p.elbowL : p.elbowR;
  const wrist = side === 1 ? p.wristL : p.wristR;
  const hand = side === 1 ? p.handL : p.handR;
  return (
    <group position={side === 1 ? RIG.shoulderL : RIG.shoulderR} rotation={[rot[0], rot[1], rot[2], LIMB_ORDER]}>
      <Mesh g={G.sphere} m={M.jacket} s={0.098} />
      <Mesh g={G.upperArm} m={M.jacket} p={[0, -RIG.upperArm / 2, 0]} />
      <group position={[0, -RIG.upperArm, 0]} rotation={[-elbow, 0, 0]} visible={!hideHand}>
        <Mesh g={G.sphereLo} m={M.jacket} s={0.08} />
        <Mesh g={G.forearm} m={M.jacket} p={[0, -RIG.forearm / 2 + 0.01, 0]} />
        <Mesh g={G.cyl} m={M.jacketDark} p={[0, -RIG.forearm + 0.03, 0]} s={[0.078, 0.05, 0.078]} />
        <group position={[0, -RIG.forearm, 0]} rotation={wrist}>
          <HandMesh shape={hand} side={side} />
          {holdPole && (
            <group position={[0, -0.06, 0.02]} rotation={[0.35, 0, 0.05 * side]}>
              <group position={[0, 0.1, 0]}>
                <Pole />
              </group>
            </group>
          )}
          {holdPhone && (
            <group position={[0, -0.1, 0.045]} rotation={[-0.25, 0, 0]}>
              <Phone />
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

const Leg: React.FC<{ side: 1 | -1; p: Pose }> = ({ side, p }) => {
  const rot = side === 1 ? p.legL : p.legR;
  const knee = side === 1 ? p.kneeL : p.kneeR;
  const foot = side === 1 ? p.footL : p.footR;
  return (
    <group position={side === 1 ? RIG.hipL : RIG.hipR} rotation={[rot[0], rot[1], rot[2], LIMB_ORDER]}>
      <Mesh g={G.thigh} m={M.pants} p={[0, -RIG.thigh / 2, 0]} />
      <group position={[0, -RIG.thigh, 0]} rotation={[knee, 0, 0]}>
        <Mesh g={G.sphereLo} m={M.pants} s={0.09} />
        <Mesh g={G.shin} m={M.pants} p={[0, -RIG.shin / 2, 0]} />
        <group position={[0, -RIG.shin, 0]} rotation={[foot, 0, 0]}>
          <Mesh g={G.cyl} m={M.boot} p={[0, 0.03, 0]} s={[0.1, 0.1, 0.1]} />
          <Mesh g={G.boot} m={M.boot} p={[0, -0.01, 0.05]} />
          <Mesh g={G.sole} m={M.sole} p={[0, -RIG.ankleToSole + 0.01, 0.05]} />
          <Mesh g={G.box} m={M.lace} p={[0, 0.04, 0.12]} r={[0.5, 0, 0]} s={[0.07, 0.012, 0.09]} />
        </group>
      </group>
    </group>
  );
};

export const Hiker: React.FC<HikerProps> = ({
  position,
  quaternion,
  pose: p,
  face: f,
  t,
  capOn,
  phoneInHand,
  polesInHands,
  stars = 0,
  selfieView = false,
}) => {
  return (
    <group position={position} quaternion={quaternion}>
      <group rotation={p.lean}>
        <group position={RIG.pelvis} rotation={p.pelvis}>
          <Mesh g={G.sphere} m={M.pants} p={[0, 0.02, 0]} s={[0.26, 0.17, 0.22]} />
          <Leg side={1} p={p} />
          <Leg side={-1} p={p} />
          <group position={RIG.spine} rotation={p.spine}>
            {/* belly */}
            <Mesh g={G.sphere} m={M.jacket} p={[0, 0.16, 0.035]} s={[0.3, 0.29, 0.28]} />
            <Mesh g={G.box} m={M.trim} p={[0, 0.16, 0.31]} r={[0.05, 0, 0]} s={[0.026, 0.3, 0.02]} />
            <Mesh g={G.cyl} m={M.jacketDark} p={[0, -0.02, 0.02]} s={[0.255, 0.05, 0.235]} />
            <group position={RIG.chest} rotation={p.chest}>
              <Mesh g={G.sphere} m={M.jacket} p={[0, 0.05, 0]} s={[0.3, 0.23, 0.24]} />
              <Mesh g={G.box} m={M.trim} p={[0, 0.04, 0.235]} r={[-0.25, 0, 0]} s={[0.026, 0.2, 0.02]} />
              <Mesh g={G.box} m={M.jacketDark} p={[-0.12, 0.08, 0.22]} r={[-0.25, 0, 0]} s={[0.11, 0.05, 0.02]} />
              {/* towel round the neck */}
              <Mesh g={G.towel} m={M.towel} p={[0, 0.25, 0.01]} r={[Math.PI / 2 - 0.15, 0, 0]} s={[1, 1, 0.7]} />
              <Mesh g={G.box} m={M.towel} p={[0.08, 0.13, 0.2]} r={[-0.2, 0, 0.1]} s={[0.07, 0.2, 0.03]} />
              <Mesh g={G.box} m={M.towelStripe} p={[0.08, 0.05, 0.215]} r={[-0.2, 0, 0.1]} s={[0.072, 0.025, 0.032]} />
              {/* backpack */}
              <group position={[0, -0.02, -0.29]}>
                <Mesh g={G.pack} m={M.pack} />
                <Mesh g={G.packPocket} m={M.packDark} p={[0, -0.12, -0.15]} />
                <Mesh g={G.cyl} m={M.mat} p={[0, 0.36, 0.0]} r={[0, 0, Math.PI / 2]} s={[0.095, 0.56, 0.095]} />
                <Mesh g={G.cyl} m={M.bottle} p={[0.28, 0.08, 0.02]} s={[0.052, 0.26, 0.052]} />
                <Mesh g={G.cyl} m={M.bottleCap} p={[0.28, 0.23, 0.02]} s={[0.03, 0.04, 0.03]} />
              </group>
              <Mesh g={G.strap} m={M.packDark} p={[0.15, 0.03, -0.04]} r={[0, Math.PI / 2, 0.15]} />
              <Mesh g={G.strap} m={M.packDark} p={[-0.15, 0.03, -0.04]} r={[0, Math.PI / 2, 0.15]} />
              <group position={RIG.neck} rotation={p.neck}>
                <Mesh g={G.cyl} m={M.skin} p={[0, 0.0, 0]} s={[0.09, 0.14, 0.09]} />
                <group position={RIG.head}>
                  <HikerHead f={f} t={t} capOn={capOn} stars={stars} />
                </group>
              </group>
              <Arm side={1} p={p} holdPole={polesInHands} holdPhone={false} />
              <Arm side={-1} p={p} holdPole={polesInHands} holdPhone={phoneInHand} hideHand={selfieView} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
