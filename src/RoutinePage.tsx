import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { digestAgentPrompt } from "./brief";
import { catalog } from "./data";
import { HostBrief } from "./HostBrief";
import { listingLine } from "./listing";
import { safePaperUrl } from "./links";
import { composeBoard, type Prefs } from "./rank";
import { useSession } from "./session-context";
import { TrendMark } from "./Trend";

const boardDates = catalog.map((edition) => edition.date).sort((a, b) => b.localeCompare(a));
const latestBoard = boardDates[0];

function boardPath(date: string) {
  return date === latestBoard ? "/" : `/d/${date}`;
}

export function RoutineStart() {
  if (!latestBoard) return <Navigate to="/" replace />;
  return <Navigate to={`/routine/${latestBoard}/1`} replace />;
}

export function RoutinePage() {
  const { date = "", step = "1" } = useParams();
  const { prefs } = useOutletContext<{ prefs: Prefs }>();
  const { account, saves, toggleSave, toast } = useSession();
  const navigate = useNavigate();
  const edition = catalog.find((item) => item.date === date);

  const papers = useMemo(() => {
    if (!edition) return [];
    const { focus, rest } = composeBoard(edition.papers, prefs);
    return prefs.interests.length ? [...focus, ...rest] : edition.papers;
  }, [edition, prefs]);

  const done = step === "done";
  const index = done ? papers.length : Math.max(0, Number(step) - 1);
  const paper = !done ? papers[index] : undefined;
  const last = index >= papers.length - 1;
  const nextTo = last
    ? `/routine/${date}/done`
    : `/routine/${date}/${index + 2}`;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = done
      ? "Caught up · PaperScroll"
      : paper
        ? `${paper.title} · Routine · PaperScroll`
        : "PaperScroll";
    return () => {
      document.title = "PaperScroll";
    };
  }, [done, paper]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (done) return;
      if (event.key === "ArrowRight" || event.key === "n" || event.key === "N") {
        event.preventDefault();
        navigate(nextTo);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, navigate, nextTo]);

  if (!edition || papers.length === 0) {
    return <Navigate to={boardPath(date || latestBoard)} replace />;
  }
  if (!done && !paper) {
    return <Navigate to={`/routine/${date}/done`} replace />;
  }

  async function copyPrompt() {
    const text = digestAgentPrompt({
      origin: window.location.origin,
      date,
    });
    await navigator.clipboard.writeText(text);
    toast(
      account
        ? "Prompt copied. The agent needs a digest token from Account."
        : "Prompt copied. Sign in and mint a digest token so the agent can auth.",
    );
  }

  if (done) {
    return (
      <div className="routine-page caught-page">
        <header className="routine-bar">
          <Link to={boardPath(date)} className="quiet-link">
            Leave
          </Link>
        </header>
        <div className="caught">
          <span className="caught-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <path
                className="caught-check"
                d="M6.5 14.5 L12 20 L21.5 8.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="caught-kicker">{edition.label}</p>
          <h1>Caught up</h1>
          <p className="caught-lede">
            {papers.length} hosted packet{papers.length === 1 ? "" : "s"} finished.
            Save the papers that deserve a full read; the shared slate stays the same.
          </p>
          <div className="caught-actions">
            <Link to={boardPath(date)} className="btn primary">
              Back to the board
            </Link>
            <Link to="/saved" className="btn">Open saved</Link>
          </div>
          <div className="caught-handoff">
            <p>Optional: send the same host packets to an agent for workspace context.</p>
            <button type="button" className="quiet-link" onClick={() => void copyPrompt()}>
              Copy agent handoff
            </button>
            <span> · </span>
            {account ? (
              <Link to="/account" className="quiet-link">Manage digest token</Link>
            ) : (
              <Link to="/login" className="quiet-link">Sign in for a token</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return <Navigate to={`/routine/${date}/done`} replace />;
  }

  const pdf = safePaperUrl(paper.url);
  const saved = saves.includes(paper.id) || saves.includes(paper.arxivId);

  return (
    <div className="routine-page">
      <header className="routine-bar">
        <Link to={boardPath(date)} className="quiet-link">
          Leave
        </Link>
        <span className="routine-count">
          {index + 1} / {papers.length}
        </span>
        <Link to={`/p/${paper.id}`} className="quiet-link">
          Full page
        </Link>
      </header>

      <article className="sheet routine-sheet">
        <p className="sheet-meta">
          <span>{paper.topic}</span>
          <span>{paper.arxivId}</span>
        </p>
        <h1>{paper.title}</h1>
        <p className="sheet-byline">
          {paper.authors}
          <span>{listingLine(paper)}</span>
        </p>
        {paper.trend ? <TrendMark trend={paper.trend} /> : null}
        <HostBrief paper={paper} />
      </article>

      <footer className="routine-foot">
        <div className="routine-secondary">
          {pdf ? (
            <a className="btn" href={pdf} target="_blank" rel="noreferrer">
              Read paper
            </a>
          ) : null}
          <button
            type="button"
            className={saved ? "btn on" : "btn"}
            onClick={() => void toggleSave(paper.arxivId)}
          >
            {saved ? "Saved" : "Save for later"}
          </button>
        </div>
        <button type="button" className="btn primary" onClick={() => navigate(nextTo)}>
          {last ? "Finish" : "View next"}
        </button>
      </footer>
    </div>
  );
}
