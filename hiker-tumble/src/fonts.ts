import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Open-source Korean fonts (SIL OFL, from Google Fonts), bundled in public/fonts.
export const FONT_TITLE = "Black Han Sans";
export const FONT_BODY = "Jua";
export const FONT_SIGN = "Do Hyeon";

export const fontsReady = Promise.all([
  loadFont({ family: FONT_TITLE, url: staticFile("fonts/BlackHanSans.ttf") }),
  loadFont({ family: FONT_BODY, url: staticFile("fonts/Jua.ttf") }),
  loadFont({ family: FONT_SIGN, url: staticFile("fonts/DoHyeon.ttf") }),
]).then(() =>
  Promise.all([
    document.fonts.load(`64px "${FONT_TITLE}"`, "데굴산"),
    document.fonts.load(`64px "${FONT_BODY}"`, "정상"),
    document.fonts.load(`64px "${FONT_SIGN}"`, "등산로"),
  ]),
);
