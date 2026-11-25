import { useMemo } from "react";
import * as THREE from "three";
import { fbm2, rng } from "../lib/anim";

export const SUN_DIR = new THREE.Vector3(0.55, 0.62, 0.56).normalize();
export const FOG_COLOR = "#cfe0ea";

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
}`;
const skyFrag = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 sunDir;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
  float s = max(dot(normalize(vDir), sunDir), 0.0);
  col += vec3(1.0, 0.86, 0.6) * pow(s, 18.0) * 0.35 + vec3(1.0, 0.95, 0.85) * pow(s, 900.0) * 1.2;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const SkyDome: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          zenith: { value: new THREE.Color("#3f8fdc") },
          horizon: { value: new THREE.Color(FOG_COLOR) },
          sunDir: { value: SUN_DIR },
        },
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[2400, 32, 16]} />
    </mesh>
  );
};

/** Puffy low-poly clouds drifting slowly (driven by time). */
export const Clouds: React.FC<{ t: number }> = ({ t }) => {
  const clouds = useMemo(() => {
    const rand = rng(31);
    return Array.from({ length: 14 }, () => {
      const a = -1.2 + rand() * 2.6; // mostly in front of the main cameras
      const r = 700 + rand() * 600;
      return {
        x: Math.cos(a) * r,
        z: -Math.abs(Math.sin(a) * r) - 150,
        y: 170 + rand() * 160,
        s: 30 + rand() * 40,
        puffs: Array.from({ length: 5 + Math.floor(rand() * 4) }, (_, i) => ({
          dx: (i - 3) * 0.9 + (rand() - 0.5) * 0.6,
          dy: rand() * 0.5,
          dz: (rand() - 0.5) * 0.8,
          r: 0.7 + rand() * 0.6,
        })),
      };
    });
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#dfe9f2", emissiveIntensity: 0.55, roughness: 1, flatShading: true, fog: false }),
    [],
  );
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x + t * 1.6, c.y, c.z]} scale={c.s}>
          {c.puffs.map((p, j) => (
            <mesh key={j} geometry={geo} material={mat} position={[p.dx, p.dy, p.dz]} scale={[p.r, p.r * 0.75, p.r]} />
          ))}
        </group>
      ))}
    </group>
  );
};

/** Layered distant ridgelines (unlit bands) that fade into the haze. */
const ridgeHeight = (a: number, layer: number, base: number, amp: number) => {
  const x = Math.cos(a) * 6;
  const z = Math.sin(a) * 6;
  const n = fbm2(x + layer * 11, z + layer * 7, 5, 20 + layer);
  const ridge = 1 - Math.abs(fbm2(x * 1.7 + 4, z * 1.7 - layer, 3, 40 + layer));
  return base + amp * (0.55 * (n * 0.5 + 0.5) + 0.45 * ridge * ridge);
};

export const DistantRanges: React.FC = () => {
  const layers = useMemo(() => {
    const defs = [
      { r: 560, base: 30, amp: 120, color: "#5f8a74" },
      { r: 820, base: 50, amp: 190, color: "#7d9fa1" },
      { r: 1150, base: 80, amp: 260, color: "#9fb7c2" },
      { r: 1600, base: 120, amp: 330, color: "#bccbd5" },
    ];
    return defs.map((d, li) => {
      const seg = 360;
      const pos: number[] = [];
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const h = ridgeHeight(a, li, d.base, d.amp);
        const c = Math.cos(a);
        const sn = Math.sin(a);
        pos.push(c * d.r, h, sn * d.r, c * d.r * 1.08, -40, sn * d.r * 1.08);
      }
      const idx: number[] = [];
      for (let i = 0; i < seg; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      const m = new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide });
      return { g, m, order: -5 + li };
    });
  }, []);
  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} geometry={l.g} material={l.m} renderOrder={l.order} />
      ))}
    </group>
  );
};
