// Export the dialogue as .srt (for upload as a separate caption track).
//   npx tsx scripts/export_srt.ts
import { serializeSrt } from "@remotion/captions";
import { writeFileSync } from "node:fs";
import { SRT_LINES } from "../src/captions";

const out = new URL("../subtitles/snooze.ko.srt", import.meta.url);
writeFileSync(out, serializeSrt({ lines: SRT_LINES }));
console.log(`wrote ${out.pathname} (${SRT_LINES.length} cues)`);
