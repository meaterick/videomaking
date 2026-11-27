import { ThreeCanvas } from "@remotion/three";
import { useEffect, useState } from "react";
import { AbsoluteFill, useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { cameraAt } from "./camera/shots";
import { FONT_SIGN, FONT_TITLE, fontsReady } from "./fonts";
import { Scene } from "./Scene";

/** Reels cover. Key content stays inside the centre 4:5 crop the profile grid shows (y 285..1635). */
export const Cover: React.FC = () => {
  const { width, height } = useVideoConfig();
  const [ready, setReady] = useState(false);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("cover fonts"));
  useEffect(() => {
    fontsReady.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [continueRender, handle]);
  const t = 10.95; // peaceful snot bubble while every alarm rings
  const cam = cameraAt(t);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1410" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} camera={{ fov: 40, position: [0, 3, 3] }}>
        <Scene t={t} cam={cam} fontsReady={ready} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.4) 100%)" }} />
      <div style={{ position: "absolute", top: 330, width: "100%", textAlign: "center", fontFamily: FONT_TITLE, lineHeight: 1.05, filter: "drop-shadow(0 10px 0 rgba(0,0,0,0.4))" }}>
        <div style={{ fontSize: 132, color: "#FFE14D", WebkitTextStroke: "22px #111", paintOrder: "stroke fill" }}>알람 5개도</div>
        <div style={{ fontSize: 116, color: "#fff", WebkitTextStroke: "20px #111", paintOrder: "stroke fill" }}>못 이기는 사람 특</div>
      </div>
      <div style={{ position: "absolute", top: 1430, width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "14px 40px 18px", borderRadius: 50, background: "#ff2d55", color: "#fff", fontFamily: FONT_SIGN, fontSize: 64, boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>
          🚨 07:25 · 알람 총공격
        </div>
      </div>
    </AbsoluteFill>
  );
};
