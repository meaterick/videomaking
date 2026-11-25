import { ThreeCanvas } from "@remotion/three";
import { useEffect, useState } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { cameraAt } from "./camera/shots";
import { fontsReady } from "./fonts";
import { Overlays, PHONE_SCREEN } from "./overlay/Overlays";
import { Scene } from "./Scene";
import { Soundtrack } from "./Soundtrack";
import { isFrozen, worldTime } from "./timeline";

const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading Korean fonts for 3D sign textures"));
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

export const HikerTumble: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const real = frame / fps;
  const t = worldTime(real);
  const ready = useFontsReady();
  const cam = cameraAt(real);
  const frozen = isFrozen(real);
  const phoneBlur = interpolate(real, [PHONE_SCREEN.start, PHONE_SCREEN.start + 0.2, PHONE_SCREEN.end - 0.15, PHONE_SCREEN.end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#cfe0ea" }}>
      <AbsoluteFill
        style={{
          filter: frozen
            ? "saturate(0.18) contrast(1.15) brightness(1.02)"
            : phoneBlur > 0
              ? `blur(${phoneBlur * 7}px) brightness(${1 - phoneBlur * 0.25})`
              : undefined,
        }}
      >
        <ThreeCanvas
          width={width}
          height={height}
          shadows
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
          camera={{ fov: 38, near: 0.1, far: 5200, position: [150, 70, 150] }}
        >
          <Scene t={t} real={real} cam={cam} fontsReady={ready} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Overlays real={real} cam={cam} />
      <Soundtrack />
    </AbsoluteFill>
  );
};
