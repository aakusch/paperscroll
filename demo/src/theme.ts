import { loadFont as loadSans } from "@remotion/google-fonts/SourceSans3";
import { loadFont as loadSerif } from "@remotion/google-fonts/SourceSerif4";

export const { fontFamily: sans } = loadSans("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const { fontFamily: serif } = loadSerif("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

export const colors = {
  bg: "#f3f3f1",
  card: "#ffffff",
  ink: "#1c1c1a",
  mute: "#6a6a64",
  line: "#e6e6e1",
  accent: "#9a4f3c",
};
