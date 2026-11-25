import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Cap, Phone, Pole } from "../character/Hiker";
import { capState, hikerFK, phoneState, pineconeState } from "../character/performance";
import { FONT_SIGN, FONT_TITLE } from "../fonts";
import { fbm2, rng, V3 } from "../lib/anim";
import { EV } from "../timeline";
import { GATE_X, heightAt, SUMMIT_H, TRAILHEAD_X } from "./terrain";

// ---------------------------------------------------------------------------
// Canvas text textures
// ---------------------------------------------------------------------------
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function woodBoard(ctx: CanvasRenderingContext2D, w: number, h: number, base = "#5a3920") {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const rand = rng(w * 7 + h);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`;
    ctx.lineWidth = 1 + rand() * 3;
    const y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + (rand() - 0.5) * 20, w * 0.6, y + (rand() - 0.5) * 20, w, y + (rand() - 0.5) * 10);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,230,190,0.55)";
  ctx.lineWidth = Math.max(6, h * 0.05);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
}

function signTexture(label: string) {
  return canvasTexture(1024, 300, (ctx) => {
    woodBoard(ctx, 1024, 300);
    ctx.fillStyle = "#fff5e1";
    // arrow pointing to the summit (left, towards -x)
    ctx.beginPath();
    ctx.moveTo(70, 150);
    ctx.lineTo(170, 70);
    ctx.lineTo(170, 115);
    ctx.lineTo(250, 115);
    ctx.lineTo(250, 185);
    ctx.lineTo(170, 185);
    ctx.lineTo(170, 230);
    ctx.closePath();
    ctx.fill();
    ctx.font = `150px "${FONT_SIGN}"`;
    ctx.textBaseline = "middle";
    ctx.fillText(label, 290, 158);
  });
}

// ---------------------------------------------------------------------------
// Sign post along the tumble line
// ---------------------------------------------------------------------------
const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 1, 10);
const plankGeo = new RoundedBoxGeometry(1.5, 0.44, 0.06, 2, 0.02);
const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4426", roughness: 0.9 });

export const SignPost: React.FC<{ x: number; z: number; label: string; yaw?: number }> = ({ x, z, label, yaw = 0 }) => {
  const tex = useMemo(() => signTexture(label), [label]);
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), [tex]);
  const y = heightAt(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={postGeo} material={woodMat} position={[0, 0.85, 0]} scale={[1, 1.7, 1]} castShadow receiveShadow />
      <group position={[0, 1.45, 0.07]}>
        <mesh geometry={plankGeo} material={woodMat} castShadow />
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[1.42, 0.4]} />
          <primitive object={faceMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Summit marker stone (정상석)
// ---------------------------------------------------------------------------
export const SUMMIT_STONE: V3 = [-1.75, SUMMIT_H, -0.9];
export const SummitStone: React.FC = () => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 1024, (ctx) => {
        ctx.clearRect(0, 0, 512, 1024);
        ctx.fillStyle = "#2b2622";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `230px "${FONT_TITLE}"`;
        ["데", "굴", "산"].forEach((ch, i) => ctx.fillText(ch, 256, 170 + i * 235));
        ctx.font = `110px "${FONT_SIGN}"`;
        ctx.fillText("812m", 256, 900);
      }),
    [],
  );
  const stoneGeo = useMemo(() => {
    const g = new RoundedBoxGeometry(0.95, 1.9, 0.55, 4, 0.16);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n = fbm2(x * 3 + 5, y * 3 + z * 2, 3, 2) * 0.06;
      p.setXYZ(i, x * (1 + n) * (1 - y * 0.06), y, z * (1 + n));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b9b2a6", roughness: 0.85 }), []);
  const textMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
    [tex],
  );
  const y = heightAt(SUMMIT_STONE[0], SUMMIT_STONE[2]);
  return (
    <group position={[SUMMIT_STONE[0], y, SUMMIT_STONE[2]]} rotation={[0, 0.65, 0]}>
      <mesh geometry={stoneGeo} material={stoneMat} position={[0, 0.88, 0]} castShadow receiveShadow />
      <mesh position={[0, 0.95, 0.285]} material={textMat}>
        <planeGeometry args={[0.62, 1.24]} />
      </mesh>
      {/* base stones */}
      <mesh position={[0, 0.05, 0]} scale={[0.85, 0.22, 0.6]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#8f8a82" roughness={0.95} flatShading />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Trailhead signboard (등산로 입구) behind the leaf pile, facing the landing camera
// ---------------------------------------------------------------------------
export const TrailheadSign: React.FC = () => {
  const tex = useMemo(
    () =>
      canvasTexture(1600, 760, (ctx) => {
        woodBoard(ctx, 1600, 760, "#4d2f1a");
        ctx.fillStyle = "#fff3d6";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `250px "${FONT_TITLE}"`;
        ctx.fillText("데굴산", 800, 210);
        ctx.font = `150px "${FONT_SIGN}"`;
        ctx.fillText("등산로 입구", 800, 430);
        ctx.fillStyle = "#ffd166";
        ctx.font = `110px "${FONT_SIGN}"`;
        ctx.fillText("▲ 정상 2.4km", 800, 620);
      }),
    [],
  );
  const faceMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), [tex]);
  const x = GATE_X;
  const z = -2.8;
  return (
    <group position={[x, heightAt(x, z), z]} rotation={[0, -0.55, 0]}>
      {[-1.45, 1.45].map((px) => (
        <mesh key={px} geometry={postGeo} material={woodMat} position={[px, 1.4, 0]} scale={[1.4, 2.8, 1.4]} castShadow receiveShadow />
      ))}
      <mesh position={[0, 2.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 1.55, 0.12]} />
        <primitive object={woodMat} attach="material" />
      </mesh>
      <mesh position={[0, 2.05, 0.065]}>
        <planeGeometry args={[3.1, 1.47]} />
        <primitive object={faceMat} attach="material" />
      </mesh>
      {/* little roof */}
      <mesh position={[0, 2.98, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#3d2716" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.95, 0]} rotation={[0, 0, 0]} scale={[3.7, 0.12, 0.7]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3d2716" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Leaf pile (낙엽 더미) at the trailhead
// ---------------------------------------------------------------------------
export const LEAF_PILE: V3 = [TRAILHEAD_X, 0, 0];
export const LeafPile: React.FC = () => {
  const geometry = useMemo(() => {
    const base = new THREE.IcosahedronGeometry(1, 4);
    base.deleteAttribute("uv");
    base.deleteAttribute("normal");
    const g = mergeVertices(base);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const lump = 1 + fbm2(x * 2.6 + 3, z * 2.6 + y * 1.7, 3, 6) * 0.32;
      p.setXYZ(i, x * 1.8 * lump, Math.max(-0.05, y) * 0.98 * lump, z * 1.8 * lump);
    }
    const flat = g.toNonIndexed();
    const fp = flat.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(fp.count * 3);
    const palette = ["#d64b2a", "#e8762b", "#f2b134", "#b8321f", "#c98a2e", "#9c4d20", "#f0c84a"].map((c) => new THREE.Color(c));
    const rand = rng(21);
    for (let f = 0; f < fp.count; f += 3) {
      const c = palette[Math.floor(rand() * palette.length)];
      for (let k = 0; k < 3; k++) {
        col[(f + k) * 3] = c.r;
        col[(f + k) * 3 + 1] = c.g;
        col[(f + k) * 3 + 2] = c.b;
      }
    }
    flat.setAttribute("color", new THREE.BufferAttribute(col, 3));
    flat.computeVertexNormals();
    return flat;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), []);
  const leaves = useMemo(() => {
    const rand = rng(9);
    return Array.from({ length: 420 }, () => {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 1.75;
      const h = Math.sqrt(Math.max(0, 1 - (r / 1.75) ** 2)) * 1.0;
      return {
        p: [Math.cos(a) * r, h + 0.01, Math.sin(a) * r] as V3,
        r: [-Math.PI / 2 + (rand() - 0.5) * 0.9, 0, rand() * 6.28] as V3,
        c: ["#d64b2a", "#f0a030", "#f6c945", "#b8321f", "#e0682a"][Math.floor(rand() * 5)],
        s: 0.8 + rand() * 0.8,
      };
    });
  }, []);
  return (
    <group position={[LEAF_PILE[0], heightAt(LEAF_PILE[0], LEAF_PILE[2]) - 0.02, LEAF_PILE[2]]}>
      <mesh geometry={geometry} material={mat} castShadow receiveShadow />
      {leaves.map((l, i) => (
        <mesh key={i} position={l.p} rotation={l.r} scale={l.s}>
          <circleGeometry args={[0.07, 5]} />
          <meshStandardMaterial color={l.c} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Pinecone, poles, flying cap & phone
// ---------------------------------------------------------------------------
export const Pinecone: React.FC<{ t: number }> = ({ t }) => {
  const s = pineconeState(t);
  return (
    <group position={s.pos} rotation={s.rot} scale={[1.7 * (1 + s.squash), 1.7 * (1 - s.squash), 1.7 * (1 + s.squash)]}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0, -0.05 + i * 0.022, 0]} scale={[1 - Math.abs(i - 2.2) * 0.13, 0.6, 1 - Math.abs(i - 2.2) * 0.13]} castShadow>
          <cylinderGeometry args={[0.04, 0.045, 0.03, 9]} />
          <meshStandardMaterial color={i % 2 ? "#6e4423" : "#845531"} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
};

export const PlantedPoles: React.FC<{ t: number }> = ({ t }) => {
  const spots = useMemo(() => {
    const fk = hikerFK(EV.plantPoles);
    return [fk.handL, fk.handR].map((h, i) => ({ x: h.x, z: h.z + 0.05, tilt: i === 0 ? 0.12 : -0.12 }));
  }, []);
  if (t < EV.plantPoles) return null;
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, heightAt(s.x, s.z) - 0.1, s.z]} rotation={[0.05, 0, s.tilt]}>
          <group position={[0, 1.2, 0]}>
            <Pole />
          </group>
        </group>
      ))}
    </group>
  );
};

export const FlyingCap: React.FC<{ t: number }> = ({ t }) => {
  const c = capState(t);
  if (c.mode !== "fly") return null;
  return (
    <group position={c.pos} quaternion={c.quat}>
      <group position={[0, -0.25, 0]}>
        <Cap />
      </group>
    </group>
  );
};

export const FlyingPhone: React.FC<{ t: number }> = ({ t }) => {
  const p = phoneState(t);
  if (p.mode !== "world") return null;
  return (
    <group position={p.pos} quaternion={p.quat}>
      <Phone />
    </group>
  );
};
