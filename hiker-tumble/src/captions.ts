import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { LINES, SpeakerId } from "./timeline";

/**
 * Word-level captions in Remotion's Caption format. Timings come from the
 * generated voice (Whisper-aligned in scripts/gen_voice.py), offset by each
 * line's start in the video. Each dialogue line ends with a page break.
 */
export const CAPTIONS: Caption[] = LINES.flatMap((line) =>
  line.words.map((w, i) => {
    const startMs = Math.round(line.start * 1000 + w.startMs);
    const endMs = Math.round(line.start * 1000 + w.endMs);
    return {
      text: (i === 0 ? "" : " ") + w.text,
      startMs,
      endMs,
      timestampMs: Math.round((startMs + endMs) / 2),
      confidence: 1,
      pageBreakAfter: i === line.words.length - 1,
    };
  }),
);

export const PAGES = createTikTokStyleCaptions({
  captions: CAPTIONS,
  combineTokensWithinMilliseconds: 8000,
}).pages;

export const speakerOfPage = (startMs: number): SpeakerId => {
  const line = LINES.find((l) => startMs >= l.start * 1000 - 50 && startMs < (l.start + l.duration) * 1000);
  return line?.speaker ?? "hiker";
};

/** One subtitle cue per dialogue line (for the .srt export). */
export const SRT_LINES: Caption[][] = LINES.map((line) => [
  {
    text: line.text,
    startMs: Math.round(line.start * 1000),
    endMs: Math.round((line.start + line.duration + 0.35) * 1000),
    timestampMs: null,
    confidence: 1,
  },
]);
