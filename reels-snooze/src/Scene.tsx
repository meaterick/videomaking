import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Cam } from "./camera/shots";
import { Guy } from "./character/Guy";
import {
  clockTime,
  duvetState,
  GIANT,
  giantState,
  guyState,
  phoneState,
  pillowState,
  poofState,
  popState,
  roosterState,
  signState,
  SMALL_CLOCK,
  smallClockRing,
  toastFall,
} from "./character/performance";
import { clamp } from "./lib/anim";
import { EV } from "./timeline";
import { AlarmClock, Duvet, Phone, Pillow, Poof, PopDrops, Rooster, SignHand, Toast } from "./world/Props";
import { Room } from "./world/Room";

const SUN_DIR = new THREE.Vector3(-0.93, 0.34, 0.1).normalize();

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...cam.pos);
    camera.up.set(...cam.up).normalize();
    camera.lookAt(...cam.target);
    camera.fov = cam.fov;
    const dist = Math.hypot(cam.pos[0] - cam.target[0], cam.pos[1] - cam.target[1], cam.pos[2] - cam.target[2]);
    camera.near = clamp(dist * 0.05, 0.01, 0.2);
    camera.far = 60;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

const Sun: React.FC = () => {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const l = light.current;
    if (!l) return;
    target.position.set(0, 0.6, -0.6);
    target.updateMatrixWorld();
    l.target = target;
    l.position.copy(target.position).addScaledVector(SUN_DIR, 12);
    const sc = l.shadow.camera as THREE.OrthographicCamera;
    sc.left = -3.8;
    sc.right = 3.8;
    sc.top = 3.8;
    sc.bottom = -3.8;
    sc.near = 2;
    sc.far = 30;
    sc.updateProjectionMatrix();
    l.shadow.bias = -0.0005;
    l.shadow.normalBias = 0.02;
  });
  return (
    <>
      <directionalLight ref={light} castShadow intensity={4.2} color="#ffe2b4" shadow-mapSize={[2048, 2048]} />
      <primitive object={target} />
    </>
  );
};

export const Scene: React.FC<{ t: number; cam: Cam; fontsReady: boolean }> = ({ t, cam, fontsReady }) => {
  const g = guyState(t);
  const duvet = duvetState(t);
  const pillow = pillowState(t);
  const phone = phoneState(t);
  const giant = giantState(t);
  const rooster = roosterState(t);
  const sign = signState(t);
  const toast = toastFall(t);
  const poof = poofState(t);
  const pop = popState(t);
  // fully under the duvet: the duvet keeps his shape, his mesh is hidden (no poke-through)
  const underDuvet = t >= EV.dive + 0.4 && t < EV.chaos;
  const hideGuy = cam.shot === "phonePov" || underDuvet;
  return (
    <>
      <CameraRig cam={cam} />
      <color attach="background" args={["#f2e7d8"]} />
      <hemisphereLight args={["#e3eeff", "#b58e66", 1.05]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0.6, 2.45, 0.6]} intensity={5} distance={9} decay={1.6} color="#fff0d8" />
      <Sun />

      <Room fontsReady={fontsReady} clock={clockTime(t)} jacketOnHanger={t < EV.poof} />
      <Pillow position={pillow.pos} rotation={pillow.rot} />
      <Duvet mode={duvet.mode} transform={duvet.transform} />
      {phone.visible && <Phone position={phone.pos} quaternion={phone.quat} screen={phone.screen} fontsReady={fontsReady} />}
      <AlarmClock position={SMALL_CLOCK.pos} yaw={SMALL_CLOCK.yaw} time={clockTime(t)} ring={smallClockRing(t)} t={t} />
      {giant.visible && (
        <AlarmClock
          position={[GIANT.pos[0], giant.y, GIANT.pos[2]]}
          yaw={GIANT.yaw}
          scale={GIANT.scale}
          time={clockTime(t)}
          ring={giant.ring}
          t={t}
          squash={giant.squash}
        />
      )}
      {rooster.visible && <Rooster position={rooster.pos} yaw={rooster.yaw} flap={rooster.flap} crow={rooster.crow} tilt={rooster.tilt} t={t} />}
      <SignHand base={sign.base} lift={sign.lift} wave={sign.wave} fontsReady={fontsReady} />
      {toast.visible && <Toast position={toast.pos} rotation={toast.rot} />}
      <Poof center={poof.center} u={poof.u} />
      <PopDrops center={pop.center} u={pop.u} />
      {g.visible && !hideGuy && (
        <Guy
          position={g.pos}
          quaternion={g.quat}
          pose={g.pose}
          face={g.face}
          t={t}
          extras={{ snot: g.snot, dressed: g.dressed, tieFlap: g.tieFlap, toast: g.toast }}
        />
      )}
    </>
  );
};
