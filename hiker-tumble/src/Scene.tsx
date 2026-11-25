import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Cam } from "./camera/shots";
import { Hiker } from "./character/Hiker";
import { hikerState } from "./character/performance";
import { clamp } from "./lib/anim";
import { DustBursts, LeafBursts } from "./world/Particles";
import {
  FlyingCap,
  FlyingPhone,
  LeafPile,
  Pinecone,
  PlantedPoles,
  SignPost,
  SummitStone,
  TrailheadSign,
} from "./world/Props";
import { Clouds, DistantRanges, FOG_COLOR, SkyDome, SUN_DIR } from "./world/Sky";
import { Squirrel } from "./world/Squirrel";
import { Terrain } from "./world/Terrain";
import { Bushes, FallenLeaves, Rocks, Trees } from "./world/Vegetation";

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const dist = Math.hypot(cam.pos[0] - cam.target[0], cam.pos[1] - cam.target[1], cam.pos[2] - cam.target[2]);
    camera.position.set(...cam.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...cam.target);
    if (cam.roll) camera.rotateZ(cam.roll);
    camera.fov = cam.fov;
    camera.near = clamp(dist * 0.03, 0.03, 0.8);
    camera.far = 5200;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

const Sun: React.FC<{ focus: [number, number, number]; size: number }> = ({ focus, size }) => {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const l = light.current;
    if (!l) return;
    target.position.set(...focus);
    target.updateMatrixWorld();
    l.target = target;
    l.position.set(focus[0] + SUN_DIR.x * 150, focus[1] + SUN_DIR.y * 150, focus[2] + SUN_DIR.z * 150);
    const sc = l.shadow.camera as THREE.OrthographicCamera;
    sc.left = -size;
    sc.right = size;
    sc.top = size;
    sc.bottom = -size;
    sc.near = 1;
    sc.far = 450;
    sc.updateProjectionMatrix();
    l.shadow.bias = -0.0004 * Math.max(1, size / 20);
    l.shadow.normalBias = 0.02 + size * 0.002;
  });
  return (
    <>
      <directionalLight ref={light} castShadow intensity={2.7} color="#fff0da" shadow-mapSize={[2048, 2048]} />
      <primitive object={target} />
    </>
  );
};

const HikerActor: React.FC<{ t: number; selfieView: boolean }> = ({ t, selfieView }) => {
  const s = hikerState(t);
  return (
    <Hiker
      position={s.pos}
      quaternion={s.quat}
      pose={s.pose}
      face={s.face}
      t={t}
      capOn={s.capOn}
      phoneInHand={s.phoneInHand}
      polesInHands={s.polesInHands}
      stars={s.stars}
      selfieView={selfieView}
    />
  );
};

export const Scene: React.FC<{ t: number; real: number; cam: Cam; fontsReady: boolean }> = ({ t, real, cam, fontsReady }) => {
  return (
    <>
      <CameraRig cam={cam} />
      <fog attach="fog" args={[FOG_COLOR, 110, 1500]} />
      <SkyDome />
      <Clouds t={real} />
      <DistantRanges />
      <hemisphereLight args={["#dcecff", "#6b5134", 0.95]} />
      <ambientLight intensity={0.12} />
      <Sun focus={cam.shadowFocus} size={cam.shadowSize} />

      <Terrain />
      <Trees />
      <Rocks />
      <Bushes />
      <FallenLeaves />
      <LeafPile />

      {fontsReady && (
        <>
          <SignPost x={11} z={-3.4} label="정상 50m" />
          <SignPost x={47} z={-3.6} label="정상 300m" />
          <SignPost x={88} z={-3.6} label="정상 1.2km" />
          <SummitStone />
          <TrailheadSign />
        </>
      )}

      <Pinecone t={t} />
      <PlantedPoles t={t} />
      <FlyingCap t={t} />
      <FlyingPhone t={t} />
      <Squirrel t={t} real={real} />
      <HikerActor t={t} selfieView={cam.shot === "selfie"} />
      <DustBursts t={t} />
      <LeafBursts t={t} />
    </>
  );
};
