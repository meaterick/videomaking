import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hikerState, IMPACTS } from "../character/performance";
import { rng, V3 } from "../lib/anim";
import { EV } from "../timeline";
import { heightAt, TRAILHEAD_X } from "./terrain";

type Spec = (t: number, i: number, m: THREE.Matrix4, c: THREE.Color) => boolean;

/** Instanced mesh whose instances are recomputed every frame from time. */
const Dynamic: React.FC<{
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  t: number;
  spec: Spec;
  castShadow?: boolean;
}> = ({ count, geometry, material, t, spec, castShadow = false }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; i < count; i++) {
      if (spec(t, i, m, c)) {
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, c);
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [t, count, spec]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} castShadow={castShadow} />;
};

const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Dust puffs at every ground impact
// ---------------------------------------------------------------------------
const PUFFS = 18;
export const DustBursts: React.FC<{ t: number }> = ({ t }) => {
  const data = useMemo(() => {
    const rand = rng(5);
    return IMPACTS.map((imp) => {
      const p = hikerState(imp.t).pos;
      const ground: V3 = [p[0], heightAt(p[0], p[2]), p[2]];
      return {
        t: imp.t,
        strength: imp.strength,
        ground,
        puffs: Array.from({ length: PUFFS }, () => {
          const a = rand() * Math.PI * 2;
          const sp = 0.8 + rand() * 1.8;
          return { dir: [Math.cos(a) * sp, 0.4 + rand() * 1.1, Math.sin(a) * sp] as V3, size: 0.18 + rand() * 0.25, life: 0.7 + rand() * 0.6 };
        }),
      };
    });
  }, []);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d8c3a0", roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true }),
    [],
  );
  const spec: Spec = useMemo(
    () => (time, i, m, c) => {
      const burst = data[Math.floor(i / PUFFS)];
      const puff = burst.puffs[i % PUFFS];
      const u = (time - burst.t) / puff.life;
      if (u < 0 || u >= 1) return false;
      const k = burst.strength;
      const d = 1 - Math.pow(1 - u, 3);
      v.set(burst.ground[0] + puff.dir[0] * d * k, burst.ground[1] + 0.15 + puff.dir[1] * d * k, burst.ground[2] + puff.dir[2] * d * k);
      const size = puff.size * (0.6 + u * 1.6) * (0.6 + k * 0.6) * (1 - u * 0.4);
      s.set(size, size, size);
      m.compose(v, q.identity(), s);
      c.setRGB(1 - u * 0.15, 1 - u * 0.15, 1 - u * 0.15);
      return true;
    },
    [data],
  );
  return <Dynamic count={data.length * PUFFS} geometry={geometry} material={material} t={t} spec={spec} />;
};

// ---------------------------------------------------------------------------
// Leaf explosions at the leaf pile (landing + popping out)
// ---------------------------------------------------------------------------
const LEAF_COLORS = ["#d64b2a", "#e8762b", "#f2b134", "#b8321f", "#f0c84a", "#c9612a"].map((c) => new THREE.Color(c));

export const LeafBursts: React.FC<{ t: number }> = ({ t }) => {
  const leaves = useMemo(() => {
    const rand = rng(77);
    const make = (t0: number, n: number, power: number) =>
      Array.from({ length: n }, () => {
        const a = rand() * Math.PI * 2;
        const r = rand() * 1.2;
        const sp = (1.5 + rand() * 3.5) * power;
        return {
          t0,
          p0: [TRAILHEAD_X + Math.cos(a) * r, 0.6 + rand() * 0.4, Math.sin(a) * r] as V3,
          vel: [Math.cos(a) * sp * 0.6, (3 + rand() * 5) * power, Math.sin(a) * sp * 0.6] as V3,
          spin: [rand() * 10, rand() * 10, rand() * 10] as V3,
          phase: rand() * 6.28,
          color: LEAF_COLORS[Math.floor(rand() * LEAF_COLORS.length)],
          size: 0.7 + rand() * 0.8,
        };
      });
    return [...make(EV.landPile, 170, 1), ...make(EV.popOut + 0.05, 70, 0.65)];
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.CircleGeometry(0.075, 5);
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), []);
  const spec: Spec = useMemo(
    () => (time, i, m, c) => {
      const L = leaves[i];
      const tau = time - L.t0;
      if (tau < 0) return false;
      const g = 9;
      const apexT = L.vel[1] / g;
      let x: number;
      let y: number;
      let z: number;
      if (tau < apexT) {
        x = L.p0[0] + L.vel[0] * tau;
        y = L.p0[1] + L.vel[1] * tau - 0.5 * g * tau * tau;
        z = L.p0[2] + L.vel[2] * tau;
      } else {
        const d = tau - apexT;
        const apexY = L.p0[1] + (L.vel[1] * L.vel[1]) / (2 * g);
        x = L.p0[0] + L.vel[0] * apexT + L.vel[0] * 0.35 * (1 - Math.exp(-d)) + 0.35 * Math.sin(d * 2.2 + L.phase);
        z = L.p0[2] + L.vel[2] * apexT + L.vel[2] * 0.35 * (1 - Math.exp(-d)) + 0.35 * Math.cos(d * 1.8 + L.phase);
        y = Math.max(heightAt(x, z) + 0.02, apexY - 0.75 * d);
      }
      const landed = y <= heightAt(x, z) + 0.03;
      const k = landed ? 0 : 1;
      e.set(L.spin[0] * tau * k - (landed ? Math.PI / 2 : 0), L.spin[1] * tau * k, L.spin[2] * tau * k);
      q.setFromEuler(e);
      v.set(x, y, z);
      s.set(L.size, L.size, L.size);
      m.compose(v, q, s);
      c.copy(L.color);
      return true;
    },
    [leaves],
  );
  return <Dynamic count={leaves.length} geometry={geometry} material={material} t={t} spec={spec} />;
};
