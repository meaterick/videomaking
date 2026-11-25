import { AbsoluteFill, Easing, interpolate, Interactive, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_BODY, FONT_TITLE } from "../fonts";

const TITLE = "초고속 하산";

/** Opening title (0.4s – 4.9s). */
export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 96 }}>
      <Interactive.Div
        name="Title"
        style={{
          display: "flex",
          fontFamily: FONT_TITLE,
          fontSize: 176,
          opacity: interpolate(frame, [4.0 * fps, 4.5 * fps], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [4.0 * fps, 4.5 * fps], ["0px 0px", "0px -60px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.5, 0, 0.75, 0),
          }),
        }}
      >
        {TITLE.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              minWidth: ch === " " ? 50 : undefined,
              color: i < 3 ? "#ff6a2a" : "#ffd23f",
              WebkitTextStroke: "18px #ffffff",
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 10px 0 rgba(40,20,10,0.55))",
              scale: `${interpolate(frame, [i * 3, i * 3 + 9], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.7, 0.64, 1),
              })}`,
              rotate: `${Math.sin(frame / 7 + i) * 2.5}deg`,
            }}
          >
            {ch}
          </span>
        ))}
      </Interactive.Div>
      <Interactive.Div
        name="Subtitle"
        style={{
          marginTop: 6,
          fontFamily: FONT_BODY,
          fontSize: 58,
          color: "#ffffff",
          WebkitTextStroke: "10px #3b2412",
          paintOrder: "stroke fill",
          opacity: interpolate(frame, [0.9 * fps, 1.4 * fps, 4.0 * fps, 4.5 * fps], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        ~ 데굴산 등반기 ~
      </Interactive.Div>
    </AbsoluteFill>
  );
};

/** Closing safety message (58.4s – end). */
export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 110 }}>
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(20,24,40,0.62) 0%, rgba(20,24,40,0.0) 62%)",
          opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
      <Interactive.Div
        name="End message"
        style={{
          fontFamily: FONT_TITLE,
          fontSize: 108,
          lineHeight: 1.18,
          textAlign: "center",
          color: "#ffffff",
          WebkitTextStroke: "14px #e8572a",
          paintOrder: "stroke fill",
          filter: "drop-shadow(0 8px 0 rgba(0,0,0,0.35))",
          opacity: interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [0.2 * fps, 0.9 * fps], [0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
        }}
      >
        등산은 천천히,
        <br />
        하산은 더 천천히!
      </Interactive.Div>
      <Interactive.Div
        name="End sub"
        style={{
          marginTop: 26,
          fontFamily: FONT_BODY,
          fontSize: 52,
          color: "#ffe680",
          WebkitTextStroke: "9px #2b1a0e",
          paintOrder: "stroke fill",
          opacity: interpolate(frame, [1.0 * fps, 1.5 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        모두 안전 산행하세요!
      </Interactive.Div>
    </AbsoluteFill>
  );
};
