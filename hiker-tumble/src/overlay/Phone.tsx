import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Cam } from "../camera/shots";
import { DESCENT, hikerFK } from "../character/performance";
import { FONT_BODY, FONT_SIGN, FONT_TITLE } from "../fonts";
import { worldTime } from "../timeline";
import { project } from "./project";

const SHUTTER_UI_BG = "rgba(0,0,0,0.55)";

/** Phone camera interface over the selfie POV shot. */
export const PhoneCameraUI: React.FC<{ real: number; cam: Cam }> = ({ real, cam }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const face = project(
    (() => {
      const h = hikerFK(worldTime(real)).head;
      return [h.x, h.y, h.z] as [number, number, number];
    })(),
    cam,
    width,
    height,
  );
  const box = 330;
  const corner = (rot: number, x: number, y: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 54,
        height: 54,
        borderTop: "7px solid #ffd23f",
        borderLeft: "7px solid #ffd23f",
        rotate: `${rot}deg`,
      }}
    />
  );
  const appear = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: appear }}>
      {/* screen bezel with rounded corners */}
      <svg width={width} height={height} style={{ position: "absolute" }}>
        <path
          fillRule="evenodd"
          fill="#060606"
          d={`M0 0H${width}V${height}H0Z M44 116 Q44 44 116 44 H${width - 116} Q${width - 44} 44 ${width - 44} 116 V${height - 116} Q${width - 44} ${height - 44} ${width - 116} ${height - 44} H116 Q44 ${height - 44} 44 ${height - 116} Z`}
        />
      </svg>
      {/* top bar */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 44,
          right: 44,
          height: 92,
          borderRadius: "72px 72px 0 0",
          background: SHUTTER_UI_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          color: "#fff",
          fontFamily: FONT_SIGN,
          fontSize: 40,
        }}
      >
        <span>⚡ 자동</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 36, padding: "6px 22px", borderRadius: 30, background: "rgba(255,255,255,0.18)" }}>
          셀카 모드
        </span>
        <span>HDR</span>
      </div>
      {/* focus brackets on the face */}
      {face.inFront && (
        <div style={{ position: "absolute", left: face.x - box / 2, top: face.y - box / 2, width: box, height: box }}>
          {corner(0, 0, 0)}
          {corner(90, box - 54, 0)}
          {corner(180, box - 54, box - 54)}
          {corner(270, 0, box - 54)}
        </div>
      )}
      {/* bottom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 44,
          right: 44,
          height: 230,
          borderRadius: "0 0 72px 72px",
          background: SHUTTER_UI_BG,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 56,
            fontFamily: FONT_SIGN,
            fontSize: 38,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <span>인물</span>
          <span style={{ color: "#ffd23f" }}>사진</span>
          <span>동영상</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 30,
            translate: "-50% 0",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "8px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 92, height: 92, borderRadius: "50%", background: "#ffffff" }} />
        </div>
        <div style={{ position: "absolute", left: 160, bottom: 46, width: 86, height: 86, borderRadius: 18, background: "linear-gradient(135deg,#f6a04d,#c0392b)", border: "4px solid #fff" }} />
        <div
          style={{
            position: "absolute",
            right: 160,
            bottom: 50,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.22)",
            color: "#fff",
            fontSize: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⟲
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Trophy: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <path d="M18 8h28v10c0 9-6 16-14 16s-14-7-14-16z" fill="#ffd23f" stroke="#a86b00" strokeWidth="3" />
    <path d="M18 12H8c0 9 5 14 12 14M46 12h10c0 9-5 14-12 14" fill="none" stroke="#a86b00" strokeWidth="4" />
    <rect x="28" y="34" width="8" height="10" fill="#e8b400" />
    <rect x="18" y="44" width="28" height="10" rx="3" fill="#a86b00" />
  </svg>
);

/** Punchline: the fitness app proudly logs a new descent record. */
export const PhoneScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 9], [520, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const count = interpolate(frame, [4, 20], [0, DESCENT.seconds], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const timeStr = `00:${count.toFixed(1).padStart(4, "0")}`;
  const badge = interpolate(frame, [20, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.8, 0.64, 1),
  });
  const kmh = (2.4 / (DESCENT.seconds / 3600)).toFixed(1);
  const stat = (label: string, value: string) => (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 22, padding: "16px 18px" }}>
      <div style={{ fontFamily: FONT_SIGN, fontSize: 26, color: "rgba(255,255,255,0.65)" }}>{label}</div>
      <div style={{ fontFamily: FONT_TITLE, fontSize: 40, color: "#ffffff", marginTop: 4 }}>{value}</div>
    </div>
  );
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `rgba(10,14,26,${interpolate(frame, [0, 6], [0, 0.45], { extrapolateRight: "clamp" })})`,
      }}
    >
      <div
        style={{
          translate: `0px ${slide}px`,
          rotate: "-3deg",
          width: 500,
          height: 940,
          borderRadius: 70,
          background: "#0b0b0f",
          padding: 18,
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 54,
            background: "linear-gradient(180deg, #13294b 0%, #0f1c33 60%, #1d1430 100%)",
            padding: "30px 34px",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_SIGN, fontSize: 28, opacity: 0.8 }}>
            <span>11:26</span>
            <span>▮▮▮ 87%</span>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 44, display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="52" height="40" viewBox="0 0 52 40">
              <path d="M2 38 L18 12 L26 22 L34 6 L50 38 Z" fill="#7ee08a" />
              <path d="M30 14 L34 6 L38 14 Z" fill="#ffffff" />
            </svg>
            산행 기록
          </div>
          <div style={{ fontFamily: FONT_SIGN, fontSize: 34, color: "rgba(255,255,255,0.7)", marginTop: 8 }}>오늘의 하산 시간</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 104, letterSpacing: 1, lineHeight: 1, color: "#7ef0ff" }}>{timeStr}</div>
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "linear-gradient(90deg, #ffd23f, #ff9f1c)",
              color: "#3a2100",
              borderRadius: 40,
              padding: "10px 26px 10px 14px",
              fontFamily: FONT_TITLE,
              fontSize: 38,
              scale: `${badge}`,
            }}
          >
            <Trophy size={54} />
            개인 최고 기록!
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
            {stat("하산 거리", "2.4 km")}
            {stat("평균 속도", `${kmh} km/h`)}
            {stat("회전 수", `${DESCENT.turns} 바퀴`)}
            {stat("소모 칼로리", "2 kcal")}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 30, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: "auto" }}>
            ※ 등산 앱도 당황한 기록
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
