import { useState } from "react";
import type { Paper } from "./data";
import { PREVIEW_IDS } from "./previewIds";

const availablePreviews = new Set<string>(PREVIEW_IDS);

export function PaperPreview({ paper, priority = false }: { paper: Paper; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!availablePreviews.has(paper.arxivId)) return null;

  return (
    <span className={failed ? "paper-preview paper-preview-fallback" : "paper-preview"} aria-hidden="true">
      {failed ? null : (
        <img
          src={`/previews/${paper.arxivId}.jpg`}
          alt=""
          loading={priority && paper.automation?.rank && paper.automation.rank <= 2 ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
