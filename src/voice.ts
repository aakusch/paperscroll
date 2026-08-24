import { useState } from "react";
import type { Paper } from "./data";

export type HostVoice = "technical" | "plain";

const KEY = "ps_host_voice";

export function hostCopy(paper: Paper, voice: HostVoice) {
  if (voice === "plain" && paper.plain?.brief?.trim()) {
    return {
      verdictWhy: paper.plain.verdictWhy || paper.verdictWhy,
      brief: paper.plain.brief,
      takeaways: paper.plain.takeaways.length
        ? paper.plain.takeaways
        : paper.takeaways,
    };
  }
  return {
    verdictWhy: paper.verdictWhy,
    brief: paper.brief,
    takeaways: paper.takeaways,
  };
}

export function hasPlainBrief(paper: Paper) {
  return Boolean(paper.plain?.brief?.trim());
}

function readVoice(): HostVoice {
  try {
    return localStorage.getItem(KEY) === "plain" ? "plain" : "technical";
  } catch {
    return "technical";
  }
}

export function useHostVoice() {
  const [voice, setVoice] = useState<HostVoice>(readVoice);

  function set(next: HostVoice) {
    setVoice(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return [voice, set] as const;
}
