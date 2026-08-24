#!/usr/bin/env node
/**
 * Draft raw material for a PaperScroll host packet from an arXiv id.
 *
 *   OPENAI_API_KEY=… node scripts/summarize.mjs 2608.18115
 *
 * This command never publishes or writes the catalog. A host must read the
 * evidence, correct the draft, and make the final editorial judgment.
 */

const id = process.argv[2]?.replace(/^arxiv:/i, "");
if (!id) {
  console.error("usage: node scripts/summarize.mjs <arxiv-id>");
  process.exit(1);
}

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("Set OPENAI_API_KEY");
  process.exit(1);
}

const arxivRes = await fetch(
  `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`,
);
if (!arxivRes.ok) {
  console.error(`arXiv returned ${arxivRes.status}`);
  process.exit(1);
}
const xml = await arxivRes.text();
const entry = xml.split(/<entry>/i)[1]?.split(/<\/entry>/i)[0] ?? "";
if (!entry) {
  console.error(`No arXiv entry found for ${id}`);
  process.exit(1);
}

const title = unwrap(entry, "title");
const summary = unwrap(entry, "summary");
const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]);

const prompt = `You write PaperScroll briefs. Voice: a sharp editor, not a recap bot. No hype. No "delve". No "landscape".

Return ONLY JSON with keys:
- verdict: "Try" | "Watch" | "Skip"
- verdictWhy: one short sentence (why that verdict, not a slogan)
- brief: three short paragraphs separated by \\n\\n. Para 1 = the actual claim. Para 2 = evidence, artifact, what would falsify it. Para 3 = who this is for and who should ignore it.
- takeaways: array of 3 strings, each 2 sentences. Judgment, limits, artifacts.
- actions: array of 2 strings. Concrete next steps this week, including a "don't" if useful.
- topic: "AI" | "Stats" | "Math" | "Econ" | "Health" | "Physics" | "Security"
- plain: object with verdictWhy, brief, takeaways in the same shapes. Same facts, same limits, same artifacts. Written for a smart reader who is not in the subfield. Gloss jargon in the sentence; do not drop the claim or the "don't". Still three short paragraphs and three two-sentence takeaways. Not a children's version.

Field copy is for people already in the subfield. Plain copy is the same facts with jargon spelled out — comprehensive but summarized, not shorter by deleting the hard parts.

Paper:
Title: ${title}
Authors: ${authors.join(", ")}
Abstract: ${summary}`;

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You output JSON only. You never invent a GitHub URL.",
      },
      { role: "user", content: prompt },
    ],
  }),
});

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

const body = await res.json();
const usage = body.usage ?? {};
const inTok = usage.prompt_tokens ?? 0;
const outTok = usage.completion_tokens ?? 0;
console.error(`draft tokens in=${inTok} out=${outTok}`);
try {
  const draft = JSON.parse(body.choices[0].message.content);
  console.log(
    JSON.stringify(
      { reviewStatus: "DRAFT_REQUIRES_HOST_REVIEW", arxivId: id, ...draft },
      null,
      2,
    ),
  );
} catch {
  console.error("Model returned invalid JSON; nothing was published.");
  process.exit(1);
}

function unwrap(source, tag) {
  const m = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return (m?.[1] ?? "").replace(/\s+/g, " ").trim();
}
