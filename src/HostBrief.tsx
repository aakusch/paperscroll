import { AbstractText } from "./abstractText";
import type { Paper } from "./data";
import { isHostedPacket } from "./hostPacket";
import { updateWithMotion } from "./motion";
import { Tip } from "./Tip";
import { hasPlainBrief, hostCopy, useHostVoice } from "./voice";

export function HostBrief({ paper, showBasis = true }: { paper: Paper; showBasis?: boolean }) {
  const [voice, setVoice] = useHostVoice();
  const ready = isHostedPacket(paper);
  const host = hostCopy(paper, voice);
  const dual = hasPlainBrief(paper);

  return (
    <>
      {paper.abstract || paper.takeaway ? (
        ready ? (
          <details key={paper.arxivId} className="abs-block">
            <summary>
              <span className="abs-k">Abstract</span>
              <svg
                className="abs-chev"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M2.25 4.25 L6 8 L9.75 4.25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <div className="abs-panel">
              <div className="abs-panel-inner">
                <AbstractText text={paper.abstract || paper.takeaway || ""} />
              </div>
            </div>
          </details>
        ) : null
      ) : null}

      <div className="host-copy">
        {ready && host.brief ? (
          <section className="block brief-block">
          {showBasis && paper.automation ? (
            <p className="packet-basis">
              {paper.automation.packetBasis === "full-paper"
                ? "PaperScroll packet · reviewed against the full paper"
                : "PaperScroll packet · generated from the authors’ title and abstract, not the PDF"}
            </p>
          ) : null}
          <div className="host-head">
            <h2>
              {host.lead?.kind === "reported" ? "What the authors report" : "Why this paper"}
            </h2>
            {dual ? (
              <div className="voice-switch" role="group" aria-label="Brief language">
                <button
                  type="button"
                  aria-pressed={voice === "technical"}
                  className={voice === "technical" ? "on" : undefined}
                  onClick={(event) =>
                    updateWithMotion(
                      "voice",
                      () => setVoice("technical"),
                      event.detail > 0,
                    )
                  }
                >
                  Field
                </button>
                <button
                  type="button"
                  aria-pressed={voice === "plain"}
                  className={voice === "plain" ? "on" : undefined}
                  onClick={(event) =>
                    updateWithMotion(
                      "voice",
                      () => setVoice("plain"),
                      event.detail > 0,
                    )
                  }
                >
                  Plain
                </button>
              </div>
            ) : null}
          </div>
          {host.lead?.kind === "verdict" ? (
            <p className={`host-decision v-${host.lead.verdict.toLowerCase()}`}>
              {host.lead.verdict}
            </p>
          ) : null}
          {host.lead ? <p className="why-lede">{host.lead.text}</p> : null}
          {host.brief.split(/\n\n/).map((graf) => (
            <p key={graf.slice(0, 40)} className="brief-p">
              {graf}
            </p>
          ))}
          </section>
        ) : null}

        {ready && host.takeaways.length > 0 ? (
          <section className="block">
          <h2>Key takeaways</h2>
          <ol className="points">
            {host.takeaways.map((line, index) => (
              <li key={line}>
                <span className="n">{index + 1}</span>
                <p>
                  {paper.notes?.[index] ? (
                    <Tip label={paper.notes[index]}>{line}</Tip>
                  ) : (
                    line
                  )}
                </p>
              </li>
            ))}
          </ol>
          </section>
        ) : null}
      </div>

      {ready && paper.actions.length > 0 ? (
        <section className="block action-block">
          <h2>If it’s on your desk</h2>
          <ul className="do">
            {paper.actions.map((line) => (
              <li key={line}><p>{line}</p></li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
