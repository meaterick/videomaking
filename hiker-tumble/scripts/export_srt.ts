// Export the dialogue as an .srt file (for YouTube / players) using
// @remotion/captions' serializeSrt. Same timing source as the burned-in subtitles.
//   npx tsx scripts/export_srt.ts
import { serializeSrt } from "@remotion/captions";
import { writeFileSync } from "node:fs";
import { SRT_LINES } from "../src/captions";

const out = new URL("../subtitles/hiker-tumble.ko.srt", import.meta.url);
writeFileSync(out, serializeSrt({ lines: SRT_LINES }));
console.log(`wrote ${out.pathname} (${SRT_LINES.length} cues)`);
