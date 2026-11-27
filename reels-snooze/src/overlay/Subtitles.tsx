import type { TikTokPage } from "@remotion/captions";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { PAGES } from "../captions";
import { FONT_BODY } from "../fonts";

const LINGER_MS = 350;

const Page: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 1270,
          maxWidth: 880,
          textAlign: "center",
          fontFamily: FONT_BODY,
          fontSize: 82,
          lineHeight: 1.15,
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
          scale: `${interpolate(frame, [0, 5], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.34, 1.6, 0.64, 1) })}`,
          filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.45))",
        }}
      >
        {page.tokens.map((tok, i) => {
          const active = tok.fromMs <= nowMs && tok.toMs > nowMs;
          return (
            <span
              key={`${tok.fromMs}-${i}`}
              style={{ color: active ? "#FFE14D" : "#ffffff", WebkitTextStroke: "14px #111111", paintOrder: "stroke fill" }}
            >
              {tok.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Word-by-word Reels subtitles (center-lower, inside the safe zone). */
export const Subtitles: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {PAGES.map((page, i) => {
        const next = PAGES[i + 1];
        const from = Math.round((page.startMs / 1000) * fps);
        const lastEnd = page.tokens[page.tokens.length - 1]?.toMs ?? page.startMs + page.durationMs;
        const endMs = Math.min(next ? next.startMs : Infinity, lastEnd + LINGER_MS);
        const dur = Math.round(((endMs - page.startMs) / 1000) * fps);
        if (dur <= 0) return null;
        return (
          <Sequence key={i} name={`Caption ${i + 1}`} from={from} durationInFrames={dur}>
            <Page page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
