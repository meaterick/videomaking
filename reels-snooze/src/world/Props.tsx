import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BodyPoint } from "../character/rig";
import { FONT_BODY, FONT_SIGN, FONT_TITLE } from "../fonts";
import { fbm2, noise1, rng, V3 } from "../lib/anim";
import { BED, canvasTexture } from "./Room";

// ---------------------------------------------------------------------------
// Phone with a live screen
// ---------------------------------------------------------------------------
export type Screen =
  | { kind: "off" }
  | { kind: "alarm"; time: string; label: string; sub?: string; pulse: number }
  | { kind: "snoozed"; text: string }
  | { kind: "late"; time: string }
  | { kind: "saturday" };

const SW = 512;
const SH = 1060;

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawScreen(g: CanvasRenderingContext2D, s: Screen) {
  g.clearRect(0, 0, SW, SH);
  if (s.kind === "off") {
    g.fillStyle = "#050507";
    g.fillRect(0, 0, SW, SH);
    return;
  }
  const grd = g.createLinearGradient(0, 0, SW, SH);
  grd.addColorStop(0, s.kind === "late" ? "#3a0d1a" : "#24305e");
  grd.addColorStop(1, s.kind === "late" ? "#7a1530" : "#6b3fa0");
  g.fillStyle = grd;
  g.fillRect(0, 0, SW, SH);
  g.textAlign = "center";
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = `34px "${FONT_SIGN}"`;
  g.fillText("11월 28일 토요일", SW / 2, 150);
  if (s.kind === "alarm") {
    const r = 150 + s.pulse * 60;
    g.fillStyle = `rgba(255,255,255,${0.18 * (1 - s.pulse)})`;
    g.beginPath();
    g.arc(SW / 2, 330, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `200px "${FONT_TITLE}"`;
    g.fillText(s.time, SW / 2, 400);
    g.font = `54px "${FONT_BODY}"`;
    g.fillText(s.label, SW / 2, 520);
    if (s.sub) {
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.font = `34px "${FONT_SIGN}"`;
      g.fillText(s.sub, SW / 2, 580);
    }
    g.fillStyle = "#ffd23f";
    roundRect(g, 66, 760, SW - 132, 104, 52);
    g.fill();
    g.fillStyle = "#2a1c00";
    g.font = `48px "${FONT_BODY}"`;
    g.fillText("다시 알림", SW / 2, 828);
    g.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(g, 66, 890, SW - 132, 104, 52);
    g.fill();
    g.fillStyle = "#fff";
    g.fillText("중지", SW / 2, 958);
    return;
  }
  if (s.kind === "snoozed") {
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(0, 0, SW, SH);
    g.fillStyle = "#ffd23f";
    g.font = `58px "${FONT_BODY}"`;
    g.fillText(s.text, SW / 2, 520);
    return;
  }
  if (s.kind === "late") {
    g.fillStyle = "#ff5b6e";
    g.font = `210px "${FONT_TITLE}"`;
    g.fillText(s.time, SW / 2, 400);
    g.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(g, 40, 520, SW - 80, 190, 36);
    g.fill();
    g.textAlign = "left";
    g.fillStyle = "#fff";
    g.font = `40px "${FONT_BODY}"`;
    g.fillText("⏰ 알람", 80, 585);
    g.font = `50px "${FONT_TITLE}"`;
    g.fillText("놓친 알람 5개", 80, 660);
    return;
  }
  // saturday
  g.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(g, 36, 300, SW - 72, 420, 40);
  g.fill();
  g.textAlign = "left";
  g.fillStyle = "#cfe0ff";
  g.font = `38px "${FONT_BODY}"`;
  g.fillText("📅 캘린더", 76, 370);
  g.fillStyle = "#ffffff";
  g.font = `64px "${FONT_BODY}"`;
  g.fillText("오늘은", 76, 470);
  g.fillStyle = "#7ef0ff";
  g.font = `118px "${FONT_TITLE}"`;
  g.fillText("토요일", 70, 600);
  g.fillStyle = "#ffffff";
  g.font = `42px "${FONT_SIGN}"`;
  g.fillText("출근 일정 없음 🎉", 76, 676);
}

const phoneBody = new RoundedBoxGeometry(0.078, 0.158, 0.009, 3, 0.008);
const phoneMat = new THREE.MeshStandardMaterial({ color: "#1a1a22", roughness: 0.3, metalness: 0.4 });

export const Phone: React.FC<{ position: V3; quaternion: THREE.Quaternion; screen: Screen; fontsReady: boolean }> = ({ position, quaternion, screen, fontsReady }) => {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = SW;
    c.height = SH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, tex: t };
  }, []);
  const key = JSON.stringify(screen) + fontsReady;
  useLayoutEffect(() => {
    if (!fontsReady) return;
    drawScreen(canvas.getContext("2d")!, screen);
    tex.needsUpdate = true;
  }, [key, canvas, tex, screen, fontsReady]);
  return (
    <group position={position} quaternion={quaternion}>
      <mesh geometry={phoneBody} material={phoneMat} castShadow receiveShadow />
      <mesh position={[0, 0, 0.0047]}>
        <planeGeometry args={[0.071, 0.147]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.067, 0.0049]}>
        <circleGeometry args={[0.0035, 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Twin-bell alarm clock (origin at the bottom; faces +z)
// ---------------------------------------------------------------------------
const clockFaceTex = (time: string) =>
  canvasTexture(256, 256, (g) => {
    const [hh, mm] = time.split(":").map(Number);
    g.fillStyle = "#fffdf5";
    g.beginPath();
    g.arc(128, 128, 126, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#222";
    g.font = "bold 30px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillText(String(i), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96);
    }
    const hand = (a: number, len: number, w: number) => {
      g.strokeStyle = "#222";
      g.lineWidth = w;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(128, 128);
      g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len);
      g.stroke();
    };
    hand(((hh % 12) + mm / 60) * (Math.PI / 6), 52, 10);
    hand(mm * (Math.PI / 30), 80, 6);
  });

const clockMats = {
  body: new THREE.MeshStandardMaterial({ color: "#e0303a", roughness: 0.35, metalness: 0.3 }),
  metal: new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.25, metalness: 0.8 }),
  dark: new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.5 }),
};
const hemi = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);

export const AlarmClock: React.FC<{ position: V3; yaw?: number; scale?: number; time: string; ring: number; t: number; squash?: number }> = ({
  position,
  yaw = 0,
  scale = 1,
  time,
  ring,
  t,
  squash = 0,
}) => {
  const faceTex = useMemo(() => clockFaceTex(time), [time]);
  const jitter = ring * noise1(t * 40, scale) * 0.12;
  const hop = ring * Math.max(0, Math.sin(t * 34)) * 0.006 * scale;
  const hammer = ring * Math.sin(t * 95) * 0.6;
  return (
    <group position={[position[0], position[1] + hop, position[2]]} rotation={[0, yaw, jitter]} scale={[scale * (1 + squash), scale * (1 - squash), scale * (1 + squash)]}>
      {/* legs */}
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} position={[x, 0.008, 0]} material={clockMats.metal} castShadow>
          <sphereGeometry args={[0.012, 10, 8]} />
        </mesh>
      ))}
      <group position={[0, 0.088, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={clockMats.body} castShadow receiveShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.048, 32]} />
        </mesh>
        <mesh position={[0, 0, 0.025]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.064, 32]} />
          <meshStandardMaterial map={faceTex} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.025]} material={clockMats.metal}>
          <torusGeometry args={[0.067, 0.006, 8, 32]} />
        </mesh>
        {/* bells */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[0.048 * s, 0.07, -0.005]} rotation={[0, 0, -0.55 * s]} scale={0.042} material={clockMats.metal} castShadow>
            <primitive object={hemi} attach="geometry" />
          </mesh>
        ))}
        <mesh position={[0, 0.088, -0.005]} rotation={[0, 0, Math.PI / 2]} material={clockMats.metal}>
          <torusGeometry args={[0.03, 0.005, 6, 16, Math.PI]} />
        </mesh>
        {/* hammer */}
        <group position={[0, 0.07, -0.012]} rotation={[0, 0, hammer]}>
          <mesh position={[0, 0.03, 0]} material={clockMats.dark}>
            <cylinderGeometry args={[0.003, 0.003, 0.06, 6]} />
          </mesh>
          <mesh position={[0, 0.062, 0]} material={clockMats.dark}>
            <sphereGeometry args={[0.009, 8, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Rooster (origin at the feet; faces +z)
// ---------------------------------------------------------------------------
const rm = {
  white: new THREE.MeshStandardMaterial({ color: "#fbfbf7", roughness: 0.8 }),
  red: new THREE.MeshStandardMaterial({ color: "#e0262f", roughness: 0.6 }),
  yellow: new THREE.MeshStandardMaterial({ color: "#f2b31b", roughness: 0.5 }),
  tail: new THREE.MeshStandardMaterial({ color: "#1d3b2c", roughness: 0.4, metalness: 0.2 }),
  eye: new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.2 }),
  shine: new THREE.MeshBasicMaterial({ color: "#fff" }),
};
const S = new THREE.SphereGeometry(1, 18, 12);
export const Rooster: React.FC<{ position: V3; yaw: number; flap: number; crow: number; tilt: number; t: number; scale?: number }> = ({
  position,
  yaw,
  flap,
  crow,
  tilt,
  t,
  scale = 1,
}) => {
  const wing = flap * Math.sin(t * 38) * 1.1;
  const neckBack = crow * 0.6;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      {[0.035, -0.035].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.07, 0]} material={rm.yellow} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.14, 6]} />
          </mesh>
          <mesh position={[0, 0.004, 0.025]} scale={[0.02, 0.006, 0.05]} material={rm.yellow}>
            <primitive object={S} attach="geometry" />
          </mesh>
        </group>
      ))}
      <group position={[0, 0.21, 0]} rotation={[-crow * 0.25, 0, 0]}>
        <mesh scale={[0.115, 0.105, 0.15]} material={rm.white} castShadow>
          <primitive object={S} attach="geometry" />
        </mesh>
        {/* wings */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.1 * s, 0.02, -0.01]} rotation={[0, 0, s * (0.15 + wing)]}>
            <mesh position={[0.03 * s, 0, 0]} scale={[0.035, 0.08, 0.12]} material={rm.white} castShadow>
              <primitive object={S} attach="geometry" />
            </mesh>
          </group>
        ))}
        {/* tail feathers */}
        {[-0.5, -0.17, 0.17, 0.5].map((a, i) => (
          <mesh key={i} position={[a * 0.06, 0.06, -0.12]} rotation={[0, Math.PI / 2 + a * 0.4, 0]} material={rm.tail} castShadow>
            <torusGeometry args={[0.1, 0.012, 6, 14, Math.PI * 0.9]} />
          </mesh>
        ))}
        {/* neck & head */}
        <group position={[0, 0.07, 0.1]} rotation={[-0.35 - neckBack, 0, tilt]}>
          <mesh position={[0, 0.06, 0]} scale={[0.05, 0.09, 0.05]} material={rm.white} castShadow>
            <primitive object={S} attach="geometry" />
          </mesh>
          <group position={[0, 0.15, 0.02]} rotation={[neckBack * 0.5, 0, 0]}>
            <mesh scale={0.055} material={rm.white} castShadow>
              <primitive object={S} attach="geometry" />
            </mesh>
            {[-0.02, 0.005, 0.03].map((z, i) => (
              <mesh key={i} position={[0, 0.055 + (i === 1 ? 0.012 : 0), z]} scale={[0.012, 0.03, 0.02]} material={rm.red}>
                <primitive object={S} attach="geometry" />
              </mesh>
            ))}
            <mesh position={[0, -0.05, 0.04]} scale={[0.015, 0.03, 0.015]} material={rm.red}>
              <primitive object={S} attach="geometry" />
            </mesh>
            {/* beak (opens when crowing) */}
            <mesh position={[0, 0.008, 0.06]} rotation={[Math.PI / 2 - crow * 0.35, 0, 0]} material={rm.yellow}>
              <coneGeometry args={[0.016, 0.045, 8]} />
            </mesh>
            <mesh position={[0, -0.006, 0.056]} rotation={[Math.PI / 2 + crow * 0.45, 0, 0]} material={rm.yellow}>
              <coneGeometry args={[0.012, 0.035, 8]} />
            </mesh>
            {[1, -1].map((s) => (
              <group key={s} position={[0.04 * s, 0.015, 0.025]}>
                <mesh scale={0.01} material={rm.eye}>
                  <primitive object={S} attach="geometry" />
                </mesh>
                <mesh position={[0.003 * s, 0.004, 0.006]} scale={0.0035} material={rm.shine}>
                  <primitive object={S} attach="geometry" />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Duvet draped over the body (height field) — or flying / crumpled
// ---------------------------------------------------------------------------
const duvetTex = canvasTexture(
  256,
  256,
  (g) => {
    g.fillStyle = "#ffcf6e";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#fff4d6";
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        const ox = (y / 64) % 2 ? 32 : 0;
        g.beginPath();
        g.arc(x + ox + 16, y + 20, 7, 0, Math.PI * 2);
        g.arc(x + ox + 26, y + 16, 9, 0, Math.PI * 2);
        g.arc(x + ox + 36, y + 21, 7, 0, Math.PI * 2);
        g.fill();
      }
    }
  },
  [5, 6],
);
const duvetMat = new THREE.MeshStandardMaterial({ map: duvetTex, roughness: 0.92, side: THREE.DoubleSide, vertexColors: true });

const NX = 44;
const NZ = 70;
const X0 = -0.8;
const X1 = 0.8;
const Z1 = 0.2;

export type DuvetMode = { kind: "bed"; points: BodyPoint[]; edgeZ: number; t: number } | { kind: "flat" } | { kind: "messy" };

const MATTRESS = BED.mattressTop + 0.025;

export function duvetHeight(x: number, z: number, points: BodyPoint[]): number {
  let h = MATTRESS;
  for (const { p, r } of points) {
    const d = Math.hypot(x - p.x, z - p.z);
    // puffy duvet: wide soft kernel + clearance so nothing pokes through
    const k = Math.exp(-((d / (r * 1.9 + 0.07)) ** 2));
    if (k < 0.01) continue;
    const top = p.y + r + 0.08;
    h = Math.max(h, top * k + MATTRESS * (1 - k));
  }
  return h;
}

export const Duvet: React.FC<{ mode: DuvetMode; transform?: { pos: V3; rot: V3 } }> = ({ mode, transform }) => {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, NX, NZ);
    const col = new Float32Array(g.attributes.position.count * 3).fill(1);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useLayoutEffect(() => {
    const p = geometry.attributes.position as THREE.BufferAttribute;
    const c = geometry.attributes.color as THREE.BufferAttribute;
    const edgeZ = mode.kind === "bed" ? mode.edgeZ : -1.25;
    // body-driven heights, then a soft blur so the duvet reads as one cosy lump
    const W = NX + 1;
    let hf = new Float32Array(W * (NZ + 1));
    if (mode.kind === "bed") {
      for (let j = 0; j <= NZ; j++)
        for (let i = 0; i <= NX; i++)
          hf[j * W + i] = duvetHeight(X0 + ((X1 - X0) * i) / NX, edgeZ + ((Z1 - edgeZ) * j) / NZ, mode.points);
      for (let pass = 0; pass < 3; pass++) {
        const out = new Float32Array(hf.length);
        for (let j = 0; j <= NZ; j++)
          for (let i = 0; i <= NX; i++) {
            let acc = 0;
            let wsum = 0;
            for (let dj = -2; dj <= 2; dj++)
              for (let di = -2; di <= 2; di++) {
                const jj = Math.min(NZ, Math.max(0, j + dj));
                const ii = Math.min(NX, Math.max(0, i + di));
                const w = 1 / (1 + di * di + dj * dj);
                acc += hf[jj * W + ii] * w;
                wsum += w;
              }
            // never sink below the raw height by much (keeps the body covered)
            out[j * W + i] = Math.max(acc / wsum, hf[j * W + i] - 0.03);
          }
        hf = out;
      }
    }
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const k = j * (NX + 1) + i;
        const u = i / NX;
        const v = j / NZ;
        const x = X0 + (X1 - X0) * u;
        const z = edgeZ + (Z1 - edgeZ) * v;
        let y: number;
        if (mode.kind === "bed") {
          y = hf[k];
          y += Math.sin(x * 9 + z * 5) * 0.006;
        } else if (mode.kind === "messy") {
          y = MATTRESS + 0.03 + Math.max(0, fbm2(x * 2.5, z * 2.5, 3, 4)) * 0.22 + Math.max(0, 0.4 - Math.abs(z + 0.7)) * 0.2;
        } else {
          y = MATTRESS + 0.02;
        }
        // hang over the sides and the foot end
        const over = Math.max(0, Math.abs(x) - 0.63);
        y -= over * 2.6;
        const overFoot = Math.max(0, z - 0.06);
        y -= overFoot * 2.6;
        p.setXYZ(k, x, y, z);
        // white folded band near the top edge
        const band = z - edgeZ < 0.09 ? 1 : 0;
        const shade = 1 - Math.min(0.25, over * 1.2);
        c.setXYZ(k, (band ? 1.35 : 1) * shade, (band ? 1.4 : 1) * shade, (band ? 1.8 : 1) * shade);
      }
    }
    p.needsUpdate = true;
    c.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  });
  return (
    <group position={transform?.pos ?? [0, 0, 0]} rotation={transform?.rot ?? [0, 0, 0]}>
      <mesh ref={ref} geometry={geometry} material={duvetMat} castShadow receiveShadow />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Pillow, "5분만" sign, toast
// ---------------------------------------------------------------------------
const pillowGeo = new RoundedBoxGeometry(0.62, 0.14, 0.4, 4, 0.06);
const pillowMat = new THREE.MeshStandardMaterial({ color: "#f4f6fb", roughness: 0.95 });
export const Pillow: React.FC<{ position: V3; rotation?: V3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <mesh geometry={pillowGeo} material={pillowMat} position={position} rotation={rotation} castShadow receiveShadow />
);

export const SignHand: React.FC<{ base: V3; lift: number; wave: number; fontsReady: boolean }> = ({ base, lift, wave, fontsReady }) => {
  const tex = useMemo(
    () =>
      fontsReady
        ? canvasTexture(400, 260, (g) => {
            g.fillStyle = "#e8c98f";
            g.fillRect(0, 0, 400, 260);
            g.strokeStyle = "#a4793d";
            g.lineWidth = 10;
            g.strokeRect(6, 6, 388, 248);
            g.fillStyle = "#1d1d1d";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.font = `150px "${FONT_TITLE}"`;
            g.fillText("5분만", 200, 140);
          })
        : null,
    [fontsReady],
  );
  if (lift <= 0.001) return null;
  const h = 0.3 * lift;
  return (
    <group position={base} rotation={[0.25, 0, wave]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.075, h, 14]} />
        <meshStandardMaterial color="#8fc3ef" roughness={0.8} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]} scale={[0.07, 0.08, 0.06]} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#f0bf98" roughness={0.55} />
      </mesh>
      <mesh position={[0, h + 0.14, 0.02]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
        <meshStandardMaterial color="#9a6b3c" />
      </mesh>
      {tex && (
        <mesh position={[0, h + 0.3, 0.03]} castShadow>
          <boxGeometry args={[0.3, 0.19, 0.012]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
};

export const Toast: React.FC<{ position: V3; rotation: V3 }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh scale={[0.13, 0.12, 0.016]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#9a5a26" roughness={0.9} />
    </mesh>
    <mesh scale={[0.115, 0.105, 0.018]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#d9a35b" roughness={0.85} />
    </mesh>
  </group>
);

/** Cartoon smoke puff (poof) */
export const Poof: React.FC<{ center: V3; u: number }> = ({ center, u }) => {
  const puffs = useMemo(() => {
    const rand = rng(8);
    return Array.from({ length: 14 }, () => ({
      dir: [rand() - 0.5, rand() * 0.8 - 0.2, rand() - 0.5] as V3,
      s: 0.18 + rand() * 0.18,
    }));
  }, []);
  if (u <= 0 || u >= 1) return null;
  return (
    <group position={center}>
      {puffs.map((p, i) => {
        const d = 1 - Math.pow(1 - u, 3);
        return (
          <mesh key={i} position={[p.dir[0] * d * 1.2, p.dir[1] * d * 1.2, p.dir[2] * d * 1.2]} scale={p.s * (0.5 + d) * (1 - u * 0.6)}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={1 - u} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

/** Droplets from the popped snot bubble */
export const PopDrops: React.FC<{ center: V3; u: number }> = ({ center, u }) => {
  const drops = useMemo(() => {
    const rand = rng(12);
    return Array.from({ length: 10 }, () => [rand() - 0.5, rand() * 0.6 + 0.2, rand() - 0.5] as V3);
  }, []);
  if (u <= 0 || u >= 1) return null;
  return (
    <group position={center}>
      {drops.map((d, i) => (
        <mesh key={i} position={[d[0] * u * 0.5, d[1] * u * 0.5 - u * u * 0.3, d[2] * u * 0.5]} scale={0.012 * (1 - u)}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#cfe9ff" transparent opacity={0.8} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
};
