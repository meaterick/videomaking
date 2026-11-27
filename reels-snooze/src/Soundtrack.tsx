import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { DURATION_SEC, EV, LINES } from "./timeline";

const sfx = (n: string) => staticFile(`audio/sfx/${n}.wav`);
const music = (n: string) => staticFile(`audio/music/${n}.wav`);

/** Dip music a little under dialogue. */
const duck = (sec: number) => {
  let d = 0;
  for (const l of LINES) {
    d = Math.max(d, interpolate(sec, [l.start - 0.15, l.start, l.start + l.duration, l.start + l.duration + 0.25], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  return 1 - 0.4 * d;
};

type Cue = { src: string; at: number; until?: number; volume?: number; loop?: boolean };

const CUES: Cue[] = [
  // bar 1-2: phone buzz, slap
  { src: sfx("phone_buzz"), at: 0, until: EV.slap, volume: 0.45 },
  { src: sfx("slap"), at: EV.slap, volume: 0.9 },
  // bar 3: alarm clock + pillow
  { src: sfx("bell_clock"), at: EV.clockRing, until: 4.75, volume: 0.42 },
  { src: sfx("soft_thump"), at: 3.5, volume: 0.6 },
  // bar 4: phone again, dive under the duvet
  { src: sfx("ringtone_phone"), at: EV.phoneRing2, until: 6.4, volume: 0.32 },
  { src: sfx("phone_buzz"), at: EV.phoneRing2, until: 6.4, volume: 0.3 },
  { src: sfx("rustle"), at: EV.dive, volume: 0.8 },
  { src: sfx("soft_thump"), at: EV.dive + 0.25, volume: 0.45 },
  // bar 5: giant clock
  { src: sfx("whoosh"), at: EV.giantDrop, volume: 0.6 },
  { src: sfx("huge_thud"), at: EV.giantLand, volume: 0.85 },
  { src: sfx("bell_giant"), at: EV.giantLand + 0.06, until: EV.bubblePop, volume: 0.32, loop: true },
  { src: sfx("snore"), at: 7.0, volume: 0.7 },
  // bar 6: rooster & sign
  { src: sfx("wing_flap"), at: 8.0, volume: 0.6 },
  { src: sfx("bubble_pop"), at: EV.signUp, volume: 0.4 },
  // bar 7: everything at once, peaceful snot bubble
  { src: sfx("bell_clock"), at: EV.chaos, until: EV.bubblePop, volume: 0.36, loop: true },
  { src: sfx("ringtone_phone"), at: EV.chaos, until: EV.bubblePop, volume: 0.3, loop: true },
  { src: staticFile("audio/voice/r1.wav"), at: EV.roosterCrow2, volume: 0.6 },
  { src: sfx("snore"), at: 9.75, volume: 0.45 },
  { src: sfx("bubble_inflate"), at: EV.bubblePop - 0.5, volume: 0.5 },
  { src: sfx("bubble_pop"), at: EV.bubblePop, volume: 1 },
  { src: sfx("tick"), at: 11.55, volume: 0.7 },
  { src: sfx("tick"), at: 11.95, volume: 0.7 },
  // panic
  { src: sfx("whoosh"), at: EV.jump, volume: 0.7 },
  { src: sfx("rustle"), at: EV.jump + 0.05, volume: 0.8 },
  { src: sfx("poof"), at: EV.poof, volume: 0.8 },
  { src: sfx("run_steps"), at: EV.dashStart, until: EV.skid, volume: 0.6 },
  { src: sfx("skid"), at: EV.skid, volume: 0.7 },
  { src: sfx("notif"), at: EV.phoneOut + 0.05, volume: 0.6 },
  { src: sfx("record_scratch"), at: EV.saturday, volume: 0.85 },
  { src: sfx("thud"), at: EV.toastDrop + 0.42, volume: 0.25 },
  // weekend
  { src: sfx("bed_flop"), at: EV.flop, volume: 0.75 },
  { src: sfx("birds"), at: 18.5, until: EV.endRing, volume: 0.35 },
  { src: sfx("phone_buzz"), at: EV.endRing, volume: 0.5 },
];

export const Soundtrack: React.FC = () => {
  const { fps } = useVideoConfig();
  const fr = (s: number) => Math.round(s * fps);
  return (
    <>
      <Audio name="Ringtone (hook)" src={music("ringtone")} durationInFrames={fr(EV.slap)} volume={0.55} />
      <Audio name="Groove" src={music("groove")} from={fr(1.6)} durationInFrames={fr(9.6)} volume={(f) => 0.42 * duck(1.6 + f / fps)} />
      <Audio name="Stinger" src={music("stinger")} from={fr(12.35)} volume={0.55} />
      <Audio name="Panic" src={music("panic")} from={fr(12.8)} durationInFrames={fr(3.2)} volume={(f) => 0.42 * duck(12.8 + f / fps)} />
      <Audio name="Lofi" src={music("lofi")} from={fr(18.4)} durationInFrames={fr(4.0)} volume={(f) => 0.45 * duck(18.4 + f / fps)} />
      <Audio name="Ringtone (loop)" src={music("ringtone")} from={fr(EV.endRing)} durationInFrames={fr(DURATION_SEC - EV.endRing)} volume={0.72} />
      {LINES.map((l) => (
        <Audio key={l.id} name={`Voice ${l.id}`} src={staticFile(`audio/voice/${l.id}.wav`)} from={fr(l.start)} volume={l.speaker === "rooster" ? 0.75 : 1} />
      ))}
      {CUES.map((c, i) =>
        c.until !== undefined ? (
          <Sequence key={i} name={`SFX ${i}`} from={fr(c.at)} durationInFrames={Math.max(1, fr(c.until - c.at))}>
            <Audio src={c.src} volume={c.volume ?? 1} loop={c.loop} />
          </Sequence>
        ) : (
          <Audio key={i} name={`SFX ${i}`} src={c.src} from={fr(c.at)} volume={c.volume ?? 1} />
        ),
      )}
    </>
  );
};
