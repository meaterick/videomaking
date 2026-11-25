import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../lib/anim";
import { SQUIRREL_ROCK } from "../character/performance";
import { heightAt, normalAt, TRAILHEAD_X } from "./terrain";

// ---------------------------------------------------------------------------
// Placement rules
// ---------------------------------------------------------------------------
const PLAZA: [number, number] = [TRAILHEAD_X + 3, 0];

/** Keep the tumble line and every camera's line of sight clear. */
function treeAllowed(x: number, z: number, rand: () => number): boolean {
  const r = Math.hypot(x, z);
  if (r < 7.5) return false; // summit
  if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 15) return false; // trailhead plaza
  if (Math.hypot(x - SQUIRREL_ROCK[0], z - SQUIRREL_ROCK[2]) < 3) return false;
  const onLine = x > -6 && x < TRAILHEAD_X + 14;
  if (onLine) {
    if (Math.abs(z) < 6.5) return false;
    if (z > 0 && z < 17) return false; // camera side (side-tracking shots)
    if (z < 0 && z > -10 && rand() < 0.55) return false;
  }
  if (x > 96 && x < 160 && z > 0 && z < 40) return false; // launch wide shot
  if (x > 40 && x < 90 && z > 0 && z < 26 && rand() < 0.7) return false;
  return true;
}

type Tree = { x: number; y: number; z: number; s: number; kind: 0 | 1 | 2 | 3; color: THREE.Color; near: boolean; tilt: number; yaw: number };

const PALETTE = {
  maple: ["#c0392b", "#d9541e", "#e74c3c", "#b0302a", "#e8762b", "#a52a22", "#f0603a"],
  yellow: ["#f1c40f", "#f3a712", "#e8b923", "#d9a50d", "#f6d04d"],
  oak: ["#bd7a12", "#cc6f1e", "#a8521a", "#d89b2b"],
  pine: ["#2e5e3e", "#3a6b45", "#285238", "#47784c", "#335f3c"],
};

function makeTrees(): Tree[] {
  const rand = rng(1234);
  const trees: Tree[] = [];
  const add = (x: number, z: number, density: number) => {
    if (rand() > density) return;
    if (!treeAllowed(x, z, rand)) return;
    const y = heightAt(x, z);
    if (y < -1) return;
    const alt = y / 60;
    const u = rand();
    const pinePref = 0.18 + alt * 0.35;
    let kind: Tree["kind"];
    let pal: string[];
    if (u < pinePref) {
      kind = 2;
      pal = PALETTE.pine;
    } else if (u < pinePref + 0.36) {
      kind = 0;
      pal = PALETTE.maple;
    } else if (u < pinePref + 0.6) {
      kind = 1;
      pal = PALETTE.yellow;
    } else {
      kind = 3;
      pal = PALETTE.oak;
    }
    const color = new THREE.Color(pal[Math.floor(rand() * pal.length)]);
    color.offsetHSL((rand() - 0.5) * 0.02, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.08);
    const near = Math.abs(z) < 45 && x > -30 && x < 175;
    trees.push({ x, y, z, s: 0.75 + rand() * 0.65, kind, color, near, tilt: (rand() - 0.5) * 0.12, yaw: rand() * Math.PI * 2 });
  };
  // dense ring on Degul-san itself
  for (let i = 0; i < 5200; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 150;
    add(Math.cos(a) * r, Math.sin(a) * r, 0.62);
  }
  // the rest of the valley & neighbouring peaks
  for (let i = 0; i < 4200; i++) {
    add(-320 + rand() * 650, -330 + rand() * 620, 0.32);
  }
  // tidy edge rows along the tumble line (background side) for parallax
  for (let x = 4; x < TRAILHEAD_X - 6; x += 2.6) {
    if (rand() < 0.75) add(x + rand(), -7 - rand() * 4, 1);
  }
  return trees;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
const crownGeo = (() => {
  const base = new THREE.IcosahedronGeometry(1, 1);
  base.deleteAttribute("uv");
  base.deleteAttribute("normal");
  const g = mergeVertices(base);
  const p = g.attributes.position as THREE.BufferAttribute;
  const rand = rng(77);
  for (let i = 0; i < p.count; i++) {
    const f = 0.85 + rand() * 0.3;
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
})();

const pineGeo = (() => {
  const parts = [0, 1, 2].map((i) => {
    const c = new THREE.ConeGeometry(1.25 - i * 0.3, 1.6 - i * 0.2, 8, 1);
    c.translate(0, 0.9 + i * 0.85, 0);
    return c.toNonIndexed();
  });
  return mergeGeometries(parts)!;
})();

const trunkGeo = new THREE.CylinderGeometry(0.11, 0.17, 1, 6, 1).translate(0, 0.5, 0);
const rockGeo = new THREE.DodecahedronGeometry(1, 0);
const leafGeo = (() => {
  const s = new THREE.Shape();
  // five-lobed maple leaf, ~9 cm across
  const pts = 15;
  const radii = [1, 0.58, 0.74];
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = 0.045 * radii[i % 3] * (Math.abs(Math.cos(a / 2)) * 0.25 + 0.85);
    const x = Math.sin(a) * r;
    const y = Math.cos(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
})();

const flatMat = (extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, metalness: 0, ...extra });

// ---------------------------------------------------------------------------
// Instanced helper
// ---------------------------------------------------------------------------
type Inst = { m: THREE.Matrix4; c: THREE.Color };
const Instanced: React.FC<{
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: Inst[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}> = ({ geometry, material, items, castShadow = false, receiveShadow = true }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      mesh.setColorAt(i, it.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  );
};

const compose = (x: number, y: number, z: number, sx: number, sy: number, sz: number, q: THREE.Quaternion) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));

export const Trees: React.FC = () => {
  const data = useMemo(() => {
    const trees = makeTrees();
    const out = {
      crownNear: [] as Inst[],
      crownFar: [] as Inst[],
      pineNear: [] as Inst[],
      pineFar: [] as Inst[],
      trunkNear: [] as Inst[],
      trunkFar: [] as Inst[],
    };
    const trunkCol = new THREE.Color("#5b3a24");
    const pineTrunk = new THREE.Color("#8a4b2b");
    for (const t of trees) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(t.tilt, t.yaw, t.tilt * 0.5));
      const h = t.kind === 2 ? 2.2 * t.s : 2.0 * t.s;
      (t.near ? out.trunkNear : out.trunkFar).push({
        m: compose(t.x, t.y - 0.2, t.z, t.s, h, t.s, q),
        c: t.kind === 2 ? pineTrunk : trunkCol,
      });
      if (t.kind === 2) {
        (t.near ? out.pineNear : out.pineFar).push({
          m: compose(t.x, t.y + h * 0.55, t.z, t.s * 1.1, t.s * 1.35, t.s * 1.1, q),
          c: t.color,
        });
      } else {
        const sy = t.kind === 1 ? 2.1 : t.kind === 0 ? 1.55 : 1.7;
        const sxz = t.kind === 1 ? 1.35 : t.kind === 0 ? 1.9 : 1.75;
        (t.near ? out.crownNear : out.crownFar).push({
          m: compose(t.x, t.y + h + sy * t.s * 0.55, t.z, sxz * t.s, sy * t.s, sxz * t.s, q),
          c: t.color,
        });
      }
    }
    return out;
  }, []);
  const crownMat = useMemo(() => flatMat({ roughness: 0.85 }), []);
  const trunkMat = useMemo(() => flatMat({ roughness: 1 }), []);
  return (
    <group>
      <Instanced geometry={crownGeo} material={crownMat} items={data.crownNear} castShadow />
      <Instanced geometry={crownGeo} material={crownMat} items={data.crownFar} />
      <Instanced geometry={pineGeo} material={crownMat} items={data.pineNear} castShadow />
      <Instanced geometry={pineGeo} material={crownMat} items={data.pineFar} />
      <Instanced geometry={trunkGeo} material={trunkMat} items={data.trunkNear} castShadow />
      <Instanced geometry={trunkGeo} material={trunkMat} items={data.trunkFar} />
    </group>
  );
};

export const Rocks: React.FC = () => {
  const items = useMemo(() => {
    const rand = rng(99);
    const out: Inst[] = [];
    const greys = ["#8d8a84", "#a19d95", "#7c7a76", "#b3aea4", "#94897b"];
    const put = (x: number, z: number, s: number, flat = 0.6) => {
      const y = heightAt(x, z);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
      const c = new THREE.Color(greys[Math.floor(rand() * greys.length)]);
      out.push({ m: compose(x, y + s * 0.15, z, s * (0.9 + rand() * 0.5), s * flat, s * (0.9 + rand() * 0.5), q), c });
    };
    // summit boulders (keep the fall edge at +x clear)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
      const r = 3.6 + rand() * 2.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (x > 1.5 && Math.abs(z) < 3.2) continue;
      if (z > 1.5 && x > -2 && x < 6) continue; // camera side of summit
      put(x, z, 0.45 + rand() * 0.8);
    }
    // rocky outcrops flanking each bump on the tumble line
    for (const bx of [30, 52, 74, 96, 118]) {
      put(bx + 0.4, -3.1 - rand(), 0.9 + rand() * 0.6, 0.7);
      put(bx - 0.6, -4.6 - rand(), 0.6 + rand() * 0.4);
      if (bx !== 74) put(bx + 0.2, 3.2 + rand() * 0.6, 0.7 + rand() * 0.5, 0.7);
    }
    // scattered stones
    for (let i = 0; i < 420; i++) {
      const x = -60 + rand() * 230;
      const z = -70 + rand() * 120;
      if (Math.abs(z) < 2.8 && x > -2 && x < TRAILHEAD_X + 10) continue;
      if (Math.hypot(x - PLAZA[0], z) < 9) continue;
      put(x, z, 0.15 + rand() * 0.45);
    }
    return out;
  }, []);
  const mat = useMemo(() => flatMat({ roughness: 0.95 }), []);
  return <Instanced geometry={rockGeo} material={mat} items={items} castShadow />;
};

export const FallenLeaves: React.FC = () => {
  const items = useMemo(() => {
    const rand = rng(4242);
    const out: Inst[] = [];
    const cols = ["#d64b2a", "#e8762b", "#f2b134", "#b8321f", "#c98a2e", "#8f4a22", "#f0c84a"].map((c) => new THREE.Color(c));
    const up = new THREE.Vector3(0, 1, 0);
    const scatter = (cx: number, cz: number, rx: number, rz: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() * 2 - 1) * rx;
        const z = cz + (rand() * 2 - 1) * rz;
        const nrm = normalAt(x, z);
        const qn = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...nrm));
        const qy = new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5));
        const s = 0.8 + rand() * 0.9;
        out.push({
          m: compose(x, heightAt(x, z) + 0.02, z, s, s, s, qn.multiply(qy)),
          c: cols[Math.floor(rand() * cols.length)].clone().offsetHSL(0, 0, (rand() - 0.5) * 0.1),
        });
      }
    };
    scatter(0.5, 0, 4.2, 4.2, 900); // summit plateau
    scatter(16, -0.6, 14, 4.2, 1400); // upper slope
    scatter(SQUIRREL_ROCK[0] + 1, SQUIRREL_ROCK[2] - 2.2, 5, 2.6, 500);
    scatter(PLAZA[0] - 2, 0, 13, 11, 2600); // trailhead plaza
    scatter(70, -0.5, 55, 3.6, 1800);
    return out;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), []);
  return <Instanced geometry={leafGeo} material={mat} items={items} />;
};

export const Bushes: React.FC = () => {
  const items = useMemo(() => {
    const rand = rng(555);
    const out: Inst[] = [];
    const cols = ["#7a8f2e", "#a5752a", "#c4572a", "#5d7a35", "#b98a2f"].map((c) => new THREE.Color(c));
    for (let i = 0; i < 700; i++) {
      const x = -30 + rand() * 200;
      const z = -40 + rand() * 80;
      if (Math.abs(z) < 3.5 && x > -3 && x < TRAILHEAD_X + 12) continue;
      if (Math.hypot(x, z) < 4.6) continue;
      if (Math.hypot(x - PLAZA[0], z) < 8) continue;
      if (x > 68 && x < 88 && z > 3.5 && z < 17) continue; // squirrel camera path
      if (z > 3 && z < 13 && x > -3 && x < 150 && rand() < 0.75) continue;
      const s = 0.35 + rand() * 0.55;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * 6, 0));
      out.push({ m: compose(x, heightAt(x, z) + s * 0.05, z, s * 1.3, s * 0.85, s * 1.3, q), c: cols[Math.floor(rand() * cols.length)] });
    }
    return out;
  }, []);
  const mat = useMemo(() => flatMat({ roughness: 0.9 }), []);
  return <Instanced geometry={crownGeo} material={mat} items={items} castShadow />;
};
