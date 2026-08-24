import type { ReactNode } from "react";

/** Render an authors’ abstract with the markup arXiv and Daily Papers actually ship. */
export function AbstractText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <>
      {toGrafs(text).map((graf) => (
        <p key={graf.slice(0, 48)} className={className}>
          {formatInline(graf)}
        </p>
      ))}
    </>
  );
}

function toGrafs(text: string): string[] {
  const explicit = text
    .split(/\n{2,}/)
    .map((graf) => graf.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (explicit.length > 1) return explicit;
  const one = (explicit[0] || text).replace(/\s+/g, " ").trim();
  if (one.length < 380) return [one];
  const sentences = one.split(/(?<=[.?!])\s+(?=[A-Z“"(])/);
  if (sentences.length < 3) return [one];
  const grafs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    grafs.push(sentences.slice(i, i + 2).join(" "));
  }
  return grafs;
}

function formatInline(src: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /\$([^$]+)\$|\\textbf\{([^}]+)\}|\\textit\{([^}]+)\}|\\emph\{([^}]+)\}|\*\*([^*]+)\*\*|<(?:strong|b)>([^<]*)<\/(?:strong|b)>|<(?:em|i)>([^<]*)<\/(?:em|i)>/gi;
  let cursor = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    if (match.index > cursor) {
      nodes.push(src.slice(cursor, match.index));
    }
    const key = `m${i++}`;
    if (match[1] != null) {
      nodes.push(
        <em key={key} className="math">
          {tidyMath(match[1])}
        </em>,
      );
    } else if (match[2] != null || match[5] != null || match[6] != null) {
      nodes.push(
        <strong key={key}>{match[2] ?? match[5] ?? match[6]}</strong>,
      );
    } else {
      nodes.push(<em key={key}>{match[3] ?? match[4] ?? match[7]}</em>);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < src.length) nodes.push(src.slice(cursor));
  return nodes;
}

function tidyMath(src: string) {
  return src
    .replace(/\\log/g, "log")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\hat\{([^}]+)\}/g, "$1̂")
    .replace(/\\hatπ/g, "π̂")
    .replace(/\\pi\b/g, "π")
    .replace(/\\infty/g, "∞")
    .replace(/\\%/g, "%")
    .replace(/\\,/g, " ")
    .replace(/\\ /g, " ");
}
