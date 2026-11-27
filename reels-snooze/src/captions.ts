import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { LINES } from "./timeline";

/** Word-level captions (Whisper-aligned timings from scripts/gen_voice.py). */
export const CAPTIONS: Caption[] = LINES.filter((l) => l.caption).flatMap((line) =>
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

export const PAGES = createTikTokStyleCaptions({ captions: CAPTIONS, combineTokensWithinMilliseconds: 1600 }).pages;

/** One cue per line for the .srt export. */
export const SRT_LINES: Caption[][] = LINES.filter((l) => l.caption).map((line) => [
  { text: line.text, startMs: Math.round(line.start * 1000), endMs: Math.round((line.start + line.duration + 0.3) * 1000), timestampMs: null, confidence: 1 },
]);
