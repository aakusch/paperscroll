import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { digestAgentPrompt } from "./brief";
import { catalog } from "./data";
import { HostBrief } from "./HostBrief";
import { listingLine } from "./listing";
import { beginRouteMotion } from "./motion";
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
  const transitionLock = useRef(false);
  const transitionTimer = useRef<number | null>(null);
  const routeMotionCleanup = useRef<(() => void) | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
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

  const advance = useCallback((animate: boolean) => {
    if (transitionLock.current) return;
    transitionLock.current = true;
    setTransitioning(true);
    const cleanup = animate ? beginRouteMotion("routine-next") : null;
    routeMotionCleanup.current = cleanup;
    navigate(nextTo, cleanup ? { viewTransition: true } : undefined);
    transitionTimer.current = window.setTimeout(() => {
      transitionLock.current = false;
      setTransitioning(false);
      routeMotionCleanup.current?.();
      routeMotionCleanup.current = null;
      transitionTimer.current = null;
    }, cleanup ? 280 : 100);
  }, [navigate, nextTo]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [done, paper]);

  useEffect(() => {
    document.title = done
      ? "Caught up · PaperScroll"
      : paper
        ? `${paper.title} · Routine · PaperScroll`
        : "PaperScroll";
    return () => {
      document.title = "PaperScroll";
    };
  }, [done, paper]);

  useEffect(() => () => {
    if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current);
    routeMotionCleanup.current?.();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        transitionLock.current
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "a, button, input, textarea, select, summary, [contenteditable='true'], [role='button'], [role='radio']",
        )
      ) return;
      if (done) return;
      if (event.key === "ArrowRight" || event.key === "n" || event.key === "N") {
        event.preventDefault();
        advance(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, done]);

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

  async function savePaper() {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      await toggleSave(paper?.arxivId || "");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update saved papers.");
    } finally {
      setSaveBusy(false);
    }
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
          <div className="caught-progress" aria-hidden="true"><span /></div>
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
            {papers.length} board packet{papers.length === 1 ? "" : "s"} finished.
            Save the papers that deserve a full read; the shared slate stays the same.
          </p>
          <div className="caught-actions">
            <Link to={boardPath(date)} className="btn primary">
              Back to the board
            </Link>
            <Link to="/saved" className="btn">Open saved</Link>
          </div>
          <div className="caught-handoff">
            <p>Optional: send the same board packets to an agent for workspace context.</p>
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
  const nextPaper = papers[index + 1];
  const progressStyle = {
    "--routine-progress": `${((index + 1) / papers.length) * 100}%`,
  } as CSSProperties;

  return (
    <div className="routine-page" data-routine-step={index + 1}>
      <header className="routine-bar" style={progressStyle}>
        <Link to={boardPath(date)} className="quiet-link">
          Leave
        </Link>
        <span className="routine-count">
          {index + 1} / {papers.length}
        </span>
        <Link to={`/p/${paper.id}`} className="quiet-link">
          Full page
        </Link>
        <span className="routine-progress" role="progressbar" aria-label="Morning routine progress" aria-valuemin={1} aria-valuemax={papers.length} aria-valuenow={index + 1} />
      </header>

      <p className="sr-only" aria-live="polite">
        Paper {index + 1} of {papers.length}: {paper.title}
      </p>

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
            aria-pressed={saved}
            aria-busy={saveBusy}
            disabled={saveBusy}
            onClick={() => void savePaper()}
          >
            <span key={saved ? "saved" : "save"} className="btn-face">
              {saveBusy ? "Saving…" : saved ? "Saved" : "Save for later"}
            </span>
          </button>
        </div>
        <button
          type="button"
          className="btn primary routine-next"
          disabled={transitioning}
          aria-label={last ? "Finish the morning routine" : `Next paper: ${nextPaper?.title || "paper"}`}
          onClick={(event) => advance(event.detail > 0)}
        >
          {last ? "Finish" : `Next · ${nextPaper?.topic || "paper"}`}
        </button>
      </footer>
    </div>
  );
}
