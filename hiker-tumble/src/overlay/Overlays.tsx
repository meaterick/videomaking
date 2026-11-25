import { AbsoluteFill, interpolate, Sequence, useVideoConfig } from "remotion";
import { Cam } from "../camera/shots";
import { DURATION_SEC, FREEZE_START } from "../timeline";
import { EndCard, TitleCard } from "./Cards";
import { PhoneCameraUI, PhoneScreen } from "./Phone";
import { Subtitles } from "./Subtitles";
import { VarietyCaptions } from "./VarietyCaptions";

export const PHONE_SCREEN = { start: 50.6, end: 52.8 };
export const END_CARD_START = 58.4;

export const Overlays: React.FC<{ real: number; cam: Cam }> = ({ real, cam }) => {
  const { fps } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill>
      {/* soft vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.28) 100%)" }} />
      {/* white flash when the world freezes */}
      <AbsoluteFill
        style={{
          backgroundColor: "#ffffff",
          opacity: interpolate(real, [FREEZE_START, FREEZE_START + 0.03, FREEZE_START + 0.3], [0, 0.75, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      {cam.shot === "selfie" && <PhoneCameraUI real={real} cam={cam} />}
      <VarietyCaptions real={real} cam={cam} />
      <Sequence name="Title" from={f(0.4)} durationInFrames={f(4.6)}>
        <TitleCard />
      </Sequence>
      <Sequence name="Phone screen" from={f(PHONE_SCREEN.start)} durationInFrames={f(PHONE_SCREEN.end - PHONE_SCREEN.start)}>
        <PhoneScreen />
      </Sequence>
      <Sequence name="End card" from={f(END_CARD_START)} durationInFrames={f(DURATION_SEC - END_CARD_START)}>
        <EndCard />
      </Sequence>
      <Subtitles />
    </AbsoluteFill>
  );
};
