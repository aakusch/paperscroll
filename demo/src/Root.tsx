import { Composition } from "remotion";
import { PaperScrollDemo, DEMO_DURATION } from "./PaperScrollDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PaperScrollDemo"
      component={PaperScrollDemo}
      durationInFrames={DEMO_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
