import { ThreeCanvas } from "@remotion/three";
import { useEffect, useState } from "react";
import { AbsoluteFill, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { cameraAt } from "./camera/shots";
import { fontsReady } from "./fonts";
import { Overlays } from "./overlay/Overlays";
import { Scene } from "./Scene";
import { Soundtrack } from "./Soundtrack";

const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading Korean fonts for screen & sign textures"));
  useEffect(() => {
    fontsReady
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [continueRender, cancelRender, handle]);
  return ready;
};

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const ready = useFontsReady();
  const cam = cameraAt(t);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1410" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ fov: 40, near: 0.05, far: 60, position: [0, 3, 3] }}
      >
        <Scene t={t} cam={cam} fontsReady={ready} />
      </ThreeCanvas>
      <Overlays t={t} cam={cam} />
      <Soundtrack />
    </AbsoluteFill>
  );
};
