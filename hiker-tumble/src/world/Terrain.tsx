import { useMemo } from "react";
import * as THREE from "three";
import { groundColor, heightAt } from "./terrain";

/** Non-uniform axis: fine spacing inside [fineMin, fineMax], coarse outside. */
function axis(min: number, max: number, fineMin: number, fineMax: number, fine: number, coarse: number) {
  const out: number[] = [];
  for (let v = min; v < fineMin; v += coarse) out.push(v);
  for (let v = fineMin; v < fineMax; v += fine) out.push(v);
  for (let v = fineMax; v <= max; v += coarse) out.push(v);
  return out;
}

export function buildTerrainGeometry() {
  const xs = axis(-320, 340, -16, 170, 0.6, 5);
  const zs = axis(-340, 300, -28, 28, 0.6, 5);
  const nx = xs.length;
  const nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const hs = new Float32Array(nx * nz);
  const tmp = new THREE.Color();
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      hs[j * nx + i] = heightAt(xs[i], zs[j]);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = xs[i];
      const z = zs[j];
      const h = hs[k];
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = z;
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(nx - 1, i + 1);
      const j0 = Math.max(0, j - 1);
      const j1 = Math.min(nz - 1, j + 1);
      const gx = (hs[j * nx + i1] - hs[j * nx + i0]) / (xs[i1] - xs[i0]);
      const gz = (hs[j1 * nx + i] - hs[j0 * nx + i]) / (zs[j1] - zs[j0]);
      const c = groundColor(x, z, h, Math.hypot(gx, gz));
      tmp.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
      col[k * 3] = tmp.r;
      col[k * 3 + 1] = tmp.g;
      col[k * 3 + 2] = tmp.b;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const Terrain: React.FC = () => {
  const geometry = useMemo(() => buildTerrainGeometry(), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
    [],
  );
  return <mesh geometry={geometry} material={material} receiveShadow />;
};
