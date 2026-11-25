import { useMemo } from "react";
import * as THREE from "three";
import { Cap } from "../character/Hiker";
import { blink } from "../character/face";
import { hikerState, ROCK_TOP, SQUIRREL_ROCK, squirrelState } from "../character/performance";
import { lerp, windowW } from "../lib/anim";

const M = {
  fur: new THREE.MeshStandardMaterial({ color: "#b8682c", roughness: 0.8 }),
  belly: new THREE.MeshStandardMaterial({ color: "#f3dcb6", roughness: 0.85 }),
  stripe: new THREE.MeshStandardMaterial({ color: "#3a2414", roughness: 0.9 }),
  light: new THREE.MeshStandardMaterial({ color: "#f6e7cf", roughness: 0.9 }),
  eye: new THREE.MeshStandardMaterial({ color: "#0d0d0d", roughness: 0.15 }),
  shine: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  nose: new THREE.MeshStandardMaterial({ color: "#3a1f1a", roughness: 0.4 }),
  acorn: new THREE.MeshStandardMaterial({ color: "#a8692e", roughness: 0.5 }),
  acornCap: new THREE.MeshStandardMaterial({ color: "#6b4a2a", roughness: 0.95, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: "#9b968c", roughness: 0.95, flatShading: true }),
};
const S = new THREE.SphereGeometry(1, 20, 14);
const SL = new THREE.SphereGeometry(1, 10, 8);
const ARC = new THREE.TorusGeometry(0.018, 0.005, 5, 12, Math.PI);

const BASE_YAW = -0.42; // facing the squirrel-shot camera

export const Squirrel: React.FC<{ t: number; real: number }> = ({ t, real }) => {
  const st = squirrelState(t);
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 1), []);

  // body yaw: idle, turn round to watch the hiker roll past, turn back
  let yaw = BASE_YAW + 0.18 * Math.sin(t * 0.7);
  if (t > 32.5 && t < 34.9) {
    const h = hikerState(t).pos;
    let target = Math.atan2(h[0] - SQUIRREL_ROCK[0], h[2] - SQUIRREL_ROCK[2]);
    while (target - yaw > Math.PI) target -= Math.PI * 2;
    while (target - yaw < -Math.PI) target += Math.PI * 2;
    yaw = lerp(yaw, target, windowW(t, 32.55, 34.9, 0.3, 0.45));
  }
  const hop = st.startle * Math.max(0, Math.sin(Math.min(1, (t - 32.7) / 0.35) * Math.PI)) * 0.12;
  const squash = st.capLand * 0.18;
  const nibble = st.nibble;
  const tail = Math.sin(t * 2.2) * 0.12 + st.startle * 0.3;
  const happy = st.proud > 0.5 || (real > 59.4 && real < 60.4);
  const bl = blink(t, 1.3);
  const eyeOpen = happy ? 0 : st.startle > 0.5 ? 1.25 : bl;
  const top = SQUIRREL_ROCK[1] + ROCK_TOP;

  return (
    <group>
      <mesh geometry={rockGeo} material={M.rock} position={[SQUIRREL_ROCK[0], SQUIRREL_ROCK[1] + 0.05, SQUIRREL_ROCK[2]]} scale={[0.42, ROCK_TOP, 0.38]} castShadow receiveShadow />
      <group position={[SQUIRREL_ROCK[0], top + hop, SQUIRREL_ROCK[2]]} rotation={[0, yaw, 0]} scale={[1 + squash * 0.5, 1 - squash, 1 + squash * 0.5]}>
        {/* haunches & feet */}
        <mesh geometry={S} material={M.fur} position={[0.07, 0.05, -0.01]} scale={[0.06, 0.055, 0.08]} castShadow />
        <mesh geometry={S} material={M.fur} position={[-0.07, 0.05, -0.01]} scale={[0.06, 0.055, 0.08]} castShadow />
        <mesh geometry={SL} material={M.belly} position={[0.06, 0.01, 0.06]} scale={[0.03, 0.015, 0.05]} />
        <mesh geometry={SL} material={M.belly} position={[-0.06, 0.01, 0.06]} scale={[0.03, 0.015, 0.05]} />
        {/* body */}
        <group position={[0, 0.14, 0]} rotation={[0.12, 0, 0]}>
          <mesh geometry={S} material={M.fur} scale={[0.1, 0.14, 0.09]} castShadow />
          <mesh geometry={S} material={M.belly} position={[0, -0.01, 0.045]} scale={[0.07, 0.11, 0.06]} />
          {[-0.035, 0, 0.035].map((x, i) => (
            <mesh key={i} geometry={SL} material={i === 1 ? M.stripe : M.light} position={[x, 0.02, -0.07]} scale={[0.009, 0.1, 0.03]} />
          ))}
          {/* arms holding the acorn */}
          <group position={[0, 0.06 + nibble * 0.01, 0.08]}>
            <mesh geometry={SL} material={M.fur} position={[0.035, -0.01, -0.01]} rotation={[0.9, 0, 0.3]} scale={[0.015, 0.045, 0.015]} />
            <mesh geometry={SL} material={M.fur} position={[-0.035, -0.01, -0.01]} rotation={[0.9, 0, -0.3]} scale={[0.015, 0.045, 0.015]} />
            <mesh geometry={S} material={M.acorn} position={[0, 0.02, 0.025]} scale={[0.026, 0.034, 0.026]} />
            <mesh geometry={SL} material={M.acornCap} position={[0, 0.048, 0.025]} scale={[0.029, 0.016, 0.029]} />
          </group>
        </group>
        {/* head */}
        <group position={[0, 0.3, 0.015]} rotation={[0.1 + nibble * 0.25 - st.startle * 0.2, 0, 0]}>
          <mesh geometry={S} material={M.fur} scale={[0.085, 0.08, 0.085]} castShadow />
          <mesh geometry={S} material={M.belly} position={[0, -0.025, 0.06]} scale={[0.05, 0.04, 0.04]} />
          <mesh geometry={SL} material={M.belly} position={[0.045, -0.02, 0.045]} scale={[0.035, 0.03, 0.03]} />
          <mesh geometry={SL} material={M.belly} position={[-0.045, -0.02, 0.045]} scale={[0.035, 0.03, 0.03]} />
          <mesh geometry={SL} material={M.nose} position={[0, -0.012, 0.098]} scale={0.012} />
          {/* face stripes */}
          <mesh geometry={SL} material={M.stripe} position={[0, 0.045, 0.06]} scale={[0.012, 0.03, 0.02]} />
          {[1, -1].map((side) => (
            <group key={side}>
              <mesh geometry={SL} material={M.stripe} position={[0.05 * side, 0.025, 0.055]} rotation={[0, 0, 0.4 * side]} scale={[0.04, 0.008, 0.02]} />
              {happy ? (
                <mesh geometry={ARC} material={M.eye} position={[0.04 * side, 0.012, 0.075]} rotation={[0, 0.4 * side, 0]} />
              ) : (
                <group position={[0.04 * side, 0.01, 0.068]} scale={[1, Math.max(0.08, eyeOpen), 1]}>
                  <mesh geometry={S} material={M.eye} scale={[0.02, 0.024, 0.016]} />
                  <mesh geometry={SL} material={M.shine} position={[0.007, 0.009, 0.012]} scale={0.006} />
                </group>
              )}
              {/* ears */}
              <mesh geometry={SL} material={M.fur} position={[0.05 * side, 0.075 + st.startle * 0.01, -0.01]} scale={[0.022, 0.028 + st.startle * 0.008, 0.012]} />
            </group>
          ))}
          {st.capOn && (
            <group position={[0, 0.0, -0.02]} rotation={[-0.15, 0, 0.12]} scale={0.48}>
              <Cap />
            </group>
          )}
        </group>
        {/* bushy tail */}
        <group position={[0, 0.06, -0.09]} rotation={[-0.25 + tail * 0.4, 0, tail * 0.3]}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const a = i / 6;
            return (
              <mesh
                key={i}
                geometry={SL}
                material={i % 3 === 1 ? M.stripe : M.fur}
                position={[0, Math.sin(a * 2.3) * 0.28, -0.05 - Math.sin(a * Math.PI) * 0.08 + a * a * 0.1]}
                scale={[0.04 + Math.sin(a * Math.PI) * 0.03, 0.06, 0.05 + Math.sin(a * Math.PI) * 0.02]}
                castShadow
              />
            );
          })}
        </group>
      </group>
    </group>
  );
};
