/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import fs from "node:fs";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Three.js needs WebGL. "angle" uses the GPU where there is one; on headless
// Linux servers without a GPU, SwiftShader ("swangle") renders on the CPU.
Config.setChromiumOpenGlRenderer(process.platform === "linux" ? "swangle" : "angle");

// Cloud sandboxes may ship a pre-installed headless shell; use it when present.
const preinstalled = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
if (fs.existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
}
