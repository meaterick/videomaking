import { Composition, Still } from "remotion";
import { Cover } from "./Cover";
import { Reel } from "./Reel";
import { DURATION_FRAMES, FPS, HEIGHT, WIDTH } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="SnoozeReel" component={Reel} durationInFrames={DURATION_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Still id="Cover" component={Cover} width={WIDTH} height={HEIGHT} />
    </>
  );
};
