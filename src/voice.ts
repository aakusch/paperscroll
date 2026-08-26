import { useState } from "react";
import type { Paper } from "./data";
import { packetLead } from "./lead";

export type HostVoice = "technical" | "plain";

const KEY = "ps_host_voice";

export function hostCopy(paper: Paper, voice: HostVoice) {
  const plain = voice === "plain" && Boolean(paper.plain?.brief?.trim());
  if (plain && paper.plain) {
    return {
      lead: packetLead(paper, true),
      brief: paper.plain.brief,
      takeaways: paper.plain.takeaways.length
        ? paper.plain.takeaways
        : paper.takeaways,
    };
  }
  return {
    lead: packetLead(paper),
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
