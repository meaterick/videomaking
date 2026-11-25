import type { TikTokPage } from "@remotion/captions";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { PAGES, speakerOfPage } from "../captions";
import { FONT_BODY } from "../fonts";
import { SPEAKERS } from "../timeline";

const LINGER_MS = 450;

const SubtitlePage: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const speaker = speakerOfPage(page.startMs);
  const highlight = SPEAKERS[speaker].color;
  const narrator = speaker === "narrator";
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        // lift above the phone-camera controls during the selfie shot
        paddingBottom: nowMs >= 17800 && nowMs < 21400 ? 300 : 64,
      }}
    >
      <div
        style={{
          maxWidth: 1560,
          padding: "12px 34px 16px",
          borderRadius: 22,
          backgroundColor: narrator ? "rgba(10, 30, 60, 0.5)" : "rgba(0, 0, 0, 0.42)",
          fontFamily: FONT_BODY,
          fontSize: narrator ? 56 : 62,
          lineHeight: 1.28,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
          opacity: interpolate(frame, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [0, 6], [0.94, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {page.tokens.map((token, i) => {
          const active = token.fromMs <= nowMs && token.toMs > nowMs;
          const spoken = token.toMs <= nowMs;
          return (
            <span
              key={`${token.fromMs}-${i}`}
              style={{
                color: active ? highlight : spoken ? "#ffffff" : "rgba(255,255,255,0.82)",
                textShadow:
                  "0 0 3px #000, 0 0 3px #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 4px 6px rgba(0,0,0,0.5)",
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Dialogue subtitles with the spoken word highlighted (karaoke style). */
export const Subtitles: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {PAGES.map((page, index) => {
        const next = PAGES[index + 1] ?? null;
        const startFrame = Math.round((page.startMs / 1000) * fps);
        const lastTokenEnd = page.tokens[page.tokens.length - 1]?.toMs ?? page.startMs + page.durationMs;
        const endMs = Math.min(next ? next.startMs : Infinity, lastTokenEnd + LINGER_MS);
        const durationInFrames = Math.round(((endMs - page.startMs) / 1000) * fps);
        if (durationInFrames <= 0) return null;
        return (
          <Sequence key={index} name={`Subtitle ${index + 1}`} from={startFrame} durationInFrames={durationInFrames}>
            <SubtitlePage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
