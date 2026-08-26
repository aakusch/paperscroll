import type { Paper } from "./data.js";
import { packetLead } from "./lead.js";
import { safeGithubUrl, safePaperUrl } from "./links.js";

/** Structured board packet shared by copy actions and the digest. Never add the raw abstract. */
export function paperPacket(paper: Paper) {
  const lead = packetLead(paper);
  const plainLead = packetLead(paper, true);
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
      // Why: a consumer pinned to the old shape keeps reading verdict, but only
      // frozen boards still carry one. New boards answer with reported/metrics.
      verdict: lead?.kind === "verdict" ? lead.verdict : null,
      verdictWhy: lead?.kind === "verdict" ? lead.text : null,
      reported: lead?.kind === "reported" ? lead.text : null,
      metrics: lead?.kind === "reported" ? lead.metrics : [],
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
            verdictWhy: plainLead?.kind === "verdict" ? plainLead.text : null,
            reported: plainLead?.kind === "reported" ? plainLead.text : null,
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
  const lead = packetLead(paper);
  if (lead?.kind === "verdict") {
    lines.push("", `PaperScroll verdict: ${lead.verdict}. ${lead.text}`, "");
  } else if (lead) {
    lines.push("", `Authors report: ${lead.text}`, "");
    if (lead.metrics.length) {
      lines.push("Reported figures:", ...lead.metrics.map((line) => `- ${line}`), "");
    }
  }
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
  const basis = paper.automation?.packetBasis === "full-paper"
    ? "This packet was reviewed against the full paper, but it remains an editorial routing note rather than a substitute for checking the source."
    : "This automated packet is constrained to the supplied title and abstract, not the PDF.";
  return `You are reading a PaperScroll board packet, not the authors' raw abstract. ${basis} Do not treat a missing detail as a reason to hallucinate methods, numbers, or a GitHub URL. If this packet is not enough, say you need the paper.

${who}

${paperMarkdown(paper)}
Using only this packet: (1) state the claim in one sentence, (2) say what would weaken it, (3) say whether it touches my desk and how — PaperScroll does not judge that for me, (4) one next step this week, or ignore.`;
}

export function digestAgentPrompt(opts: {
  origin: string;
  date: string;
}) {
  const url = `${opts.origin.replace(/\/$/, "")}/api/v1/digest/${opts.date}`;
  return `Fetch my PaperScroll morning from this endpoint, then relay it to me. Process a delivery.key only once; a repeated key is a retry. If a paper maps onto this workspace, say how. If the packet is thin, say you need the PDF. Do not invent methods, numbers, or GitHub URLs.

GET ${url}
Authorization: Bearer <digest:read token from PaperScroll → Agent routing>
Accept: application/json

The body is the PaperScroll host packet, not the authors' raw abstracts. It is always one complete shared board of ten papers.`;
}
