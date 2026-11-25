import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { CAP_FLY, HOPS, IMPACTS, LAUNCH } from "./character/performance";
import { DURATION_SEC, EV, FREEZE_LEN, FREEZE_START, LINES, realTime } from "./timeline";

const sfx = (name: string) => staticFile(`audio/sfx/${name}.wav`);
const music = (name: string) => staticFile(`audio/music/${name}.wav`);
const whoosh = sfx("whoosh");
const ding = sfx("ding");
const recordScratch = sfx("record_scratch");

/** 1 normally, dips while anyone is talking (smoothly). */
const duckAt = (sec: number, depth = 0.5) => {
  let d = 0;
  for (const l of LINES) {
    d = Math.max(
      d,
      interpolate(sec, [l.start - 0.25, l.start, l.start + l.duration, l.start + l.duration + 0.4], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }
  return 1 - d * depth;
};

type Cue = { src: string; at: number; volume?: number; dur?: number };

// footsteps of the climb (gait 0.95 Hz -> a step every ~0.526 s)
const climbSteps: Cue[] = [];
for (let k = 0, t = 0.2; t < EV.climbEnd; k++, t += 0.526) {
  const loud = t > 5.4 ? 0.55 : 0.12; // quiet in the wide establishing shot
  climbSteps.push({ src: sfx(`footstep_${(k % 3) + 1}`), at: t, volume: loud });
  if (k % 2 === 0) climbSteps.push({ src: sfx("pole_click"), at: t + 0.09, volume: loud * 0.5 });
}

const CUES: Cue[] = [
  ...climbSteps,
  // summit
  { src: sfx("footstep_1"), at: 11.75, volume: 0.5 },
  { src: sfx("footstep_2"), at: 12.02, volume: 0.5 },
  { src: sfx("pole_click"), at: 12.36, volume: 0.6 },
  { src: sfx("pole_click"), at: 12.44, volume: 0.6 },
  { src: sfx("rustle"), at: 15.3, volume: 0.45 },
  ...EV.backSteps.map((s, i) => ({ src: sfx(`footstep_${(i % 3) + 1}`), at: s + 0.42, volume: 0.45 })),
  { src: sfx("crunch"), at: EV.pineStep + 0.75, volume: 0.9 },
  // the slip
  { src: sfx("pop"), at: EV.pineSlipStart, volume: 0.5 },
  { src: whoosh, at: EV.feetUp - 0.05, volume: 0.6 },
  { src: recordScratch, at: FREEZE_START, volume: 0.85 },
  // tumbling
  ...IMPACTS.map((imp) => ({ src: sfx(imp.strength >= 0.9 ? "thud_big" : "thud_small"), at: realTime(imp.t), volume: 0.35 + imp.strength * 0.42 })),
  { src: sfx("rustle"), at: realTime(EV.slipImpact) + 0.05, volume: 0.6 },
  ...HOPS.filter((h) => h.h > 1.8).map((h) => ({ src: whoosh, at: realTime(h.t0), volume: 0.45 })),
  // squirrel & the flying cap
  { src: sfx("squeak"), at: realTime(32.75), volume: 0.55 },
  { src: whoosh, at: realTime(CAP_FLY.t0), volume: 0.25 },
  { src: sfx("pop"), at: realTime(CAP_FLY.t1), volume: 0.8 },
  { src: sfx("squeak"), at: realTime(CAP_FLY.t1) + 0.35, volume: 0.45 },
  // launch & leaf pile
  { src: whoosh, at: realTime(LAUNCH.t0), volume: 0.8 },
  { src: sfx("leaves_burst"), at: realTime(EV.landPile), volume: 0.8 },
  { src: sfx("thud_big"), at: realTime(EV.landPile), volume: 0.5 },
  ...[0.55, 1.05, 1.6, 2.15].map((d) => ({ src: sfx("rustle"), at: realTime(EV.landPile) + d, volume: 0.5 })),
  { src: sfx("boing"), at: realTime(EV.popOut), volume: 0.75 },
  { src: sfx("leaves_burst"), at: realTime(EV.popOut), volume: 0.45 },
  { src: sfx("tweets"), at: realTime(EV.popOut) + 0.2, volume: 0.4 },
  { src: sfx("sad_trombone"), at: 47.4, volume: 0.55 },
  // phone from the sky
  { src: sfx("slide_whistle_down"), at: realTime(EV.phoneBonk) - 0.62, volume: 0.5 },
  { src: sfx("bonk"), at: realTime(EV.phoneBonk), volume: 0.85 },
  { src: sfx("pop"), at: realTime(EV.phoneCatch), volume: 0.4 },
  { src: sfx("jingle"), at: 51.28, volume: 0.55 },
  { src: ding, at: 51.3, volume: 0.35 },
  { src: sfx("sparkle"), at: realTime(EV.thumbsUp) + 0.05, volume: 0.5 },
];

export const Soundtrack: React.FC = () => {
  const { fps } = useVideoConfig();
  const fr = (s: number) => Math.round(s * fps);
  const tumbleStart = FREEZE_START + FREEZE_LEN;
  const pileHit = realTime(EV.landPile);
  const outroStart = 54.6;
  return (
    <>
      {/* ambience */}
      <Sequence name="Wind" durationInFrames={fr(DURATION_SEC)}>
        <Audio src={sfx("wind")} loop volume={(f) => 0.16 * (f / fps > 26 && f / fps < 40.6 ? 0.5 : 1)} />
      </Sequence>
      <Sequence name="Birds" durationInFrames={fr(FREEZE_START)}>
        <Audio src={sfx("birds")} loop volume={0.22} />
      </Sequence>
      <Sequence name="Birds (after)" from={fr(pileHit + 0.8)} durationInFrames={fr(DURATION_SEC - pileHit - 0.8)}>
        <Audio src={sfx("birds")} loop volume={(f) => 0.26 * interpolate(f, [0, fps], [0, 1], { extrapolateRight: "clamp" })} />
      </Sequence>

      {/* music */}
      <Audio
        name="Music: hike"
        src={music("bgm_hike")}
        durationInFrames={fr(FREEZE_START)}
        volume={(f) => 0.3 * duckAt(f / fps) * interpolate(f, [0, fr(0.6)], [0, 1], { extrapolateRight: "clamp" })}
      />
      <Audio
        name="Music: tumble"
        src={music("bgm_tumble")}
        from={fr(tumbleStart)}
        durationInFrames={fr(pileHit - tumbleStart)}
        volume={(f) => 0.32 * duckAt(tumbleStart + f / fps, 0.35)}
      />
      <Audio
        name="Music: outro"
        src={music("bgm_outro")}
        from={fr(outroStart)}
        durationInFrames={fr(DURATION_SEC - outroStart)}
        volume={(f) =>
          0.34 *
          duckAt(outroStart + f / fps, 0.45) *
          interpolate(f, [fr(DURATION_SEC - outroStart - 0.8), fr(DURATION_SEC - outroStart)], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* rolling rumble during the tumble */}
      <Audio
        name="Rolling rumble"
        src={sfx("rumble")}
        from={fr(realTime(EV.slipImpact) + 0.3)}
        durationInFrames={fr(pileHit - realTime(EV.slipImpact) - 0.3)}
        volume={0.5}
      />

      {/* dialogue */}
      {LINES.map((l) => (
        <Audio key={l.id} name={`Voice ${l.id}`} src={staticFile(`audio/voice/${l.id}.wav`)} from={fr(l.start)} volume={1} />
      ))}

      {/* sound effects */}
      {CUES.map((c, i) => (
        <Audio key={i} name={`SFX ${i}`} src={c.src} from={fr(c.at)} volume={c.volume ?? 1} />
      ))}
    </>
  );
};
