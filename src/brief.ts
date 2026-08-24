import type { Paper } from "./data.js";
import { safeGithubUrl, safePaperUrl } from "./links.js";

/** Structured board packet shared by copy actions and the digest. Never add the raw abstract. */
export function paperPacket(paper: Paper) {
  const paperUrl = safePaperUrl(paper.url) ?? null;
  const codeUrl = safeGithubUrl(paper.github) ?? null;
  return {
    source: "PaperScroll",
    id: paper.id,
    arxivId: paper.arxivId,
    url: paperUrl,
    github: codeUrl,
    title: paper.title,
    authors: paper.authors,
    topic: paper.topic,
    packet: {
      verdict: paper.verdict,
      verdictWhy: paper.verdictWhy,
      brief: paper.brief?.trim() || null,
      takeaways: paper.takeaways,
      actions: paper.actions,
      links: {
        paper: paperUrl,
        code: codeUrl,
      },
      automation: paper.automation
        ? {
            boardRank: paper.automation.rank,
            selection: paper.automation.reason,
            basis: paper.automation.packetBasis,
            model: paper.automation.model,
          }
        : null,
      plain: paper.plain
        ? {
            verdictWhy: paper.plain.verdictWhy,
            brief: paper.plain.brief.trim(),
            takeaways: paper.plain.takeaways,
          }
        : null,
    },
  };
}

/** Board packet for an agent. The raw abstract is not the payload. */
export function paperMarkdown(paper: Paper) {
  const pdf = safePaperUrl(paper.url) ?? paper.url;
  const code = safeGithubUrl(paper.github);
  const lines = [
    `# ${paper.title}`,
    "",
    `${paper.authors} · ${paper.topic} · arXiv:${paper.arxivId}`,
    `PDF: ${pdf}`,
  ];
  if (code) lines.push(`Code: ${code}`);
  lines.push(
    "",
    `PaperScroll verdict: ${paper.verdict}. ${paper.verdictWhy}`,
    "",
  );
  if (paper.brief?.trim()) {
    lines.push("## Brief", paper.brief.trim(), "");
  } else {
    lines.push("_No complete board packet. Do not improvise one from a title._", "");
  }
  if (paper.takeaways.length) {
    lines.push("## Our take", ...paper.takeaways.map((line, i) => `${i + 1}. ${line}`), "");
  }
  if (paper.actions.length) {
    lines.push("## What to do", ...paper.actions.map((line) => `- ${line}`), "");
  }
  return lines.join("\n").trim() + "\n";
}

export function paperJson(paper: Paper) {
  return JSON.stringify(paperPacket(paper), null, 2);
}

export function paperAgentPrompt(paper: Paper, desk?: string) {
  const who = desk?.trim()
    ? `I work on: ${desk.trim()}.`
    : `I'm catching up on ${paper.topic} this morning.`;
  return `You are reading a PaperScroll board packet, not the authors' raw abstract. Automated packets are constrained to the supplied title and abstract, not the PDF. Do not treat a missing PDF as a reason to hallucinate methods, numbers, or a GitHub URL. If this packet is not enough, say you need the PDF.

${who}

${paperMarkdown(paper)}
Using only this packet: (1) state the claim in one sentence, (2) say what would weaken it, (3) Try / Watch / Skip for my desk — disagree with PaperScroll if the brief warrants it, (4) one next step this week, or ignore.`;
}

export function digestAgentPrompt(opts: {
  origin: string;
  date: string;
}) {
  const url = `${opts.origin.replace(/\/$/, "")}/api/v1/digest/${opts.date}`;
  return `Fetch my PaperScroll morning from this endpoint, then relay it to me. Process a delivery.key only once; a repeated key is a retry. If a paper maps onto this workspace, say how. If the packet is thin, say you need the PDF. Do not invent methods, numbers, or GitHub URLs.

GET ${url}
Authorization: Bearer <digest:read token from PaperScroll → Account → Morning route>
Accept: application/json

The body is the PaperScroll host packet, not the authors' raw abstracts. It is always one complete shared board of ten papers.`;
}
