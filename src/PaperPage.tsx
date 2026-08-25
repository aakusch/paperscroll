import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Navigate, useLocation, useParams } from "react-router-dom";
import { listComments, postComment, type ThreadComment } from "./api";
import { AuthorList } from "./Authors";
import { paperAgentPrompt, paperJson, paperMarkdown } from "./brief";
import { findPaper } from "./data";
import { IconGit } from "./icons";
import { listingDetail, listingLine } from "./listing";
import { TrendMark } from "./Trend";
import { safeGithubUrl, safePaperUrl } from "./links";
import { useSession } from "./session-context";
import { HostBrief } from "./HostBrief";

export default function PaperPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const found = findPaper(id);
  const { account, saves, toggleSave, toast } = useSession();
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentState, setCommentState] = useState<{
    paperKey: string;
    status: "ready" | "error";
    comments: ThreadComment[];
  }>({ paperKey: "", status: "ready", comments: [] });
  const [freshId, setFreshId] = useState<string | null>(null);
  const paper = found?.paper;
  const edition = found?.edition;
  const paperKey = paper?.arxivId ?? "";
  const paperTitle = paper?.title;
  const comments = commentState.paperKey === paperKey ? commentState.comments : [];
  const commentsStatus = commentState.paperKey === paperKey ? commentState.status : "loading";

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [paperTitle]);

  useEffect(() => {
    document.title = paperTitle ? `${paperTitle} · PaperScroll` : "PaperScroll";
    return () => {
      document.title = "PaperScroll";
    };
  }, [paperTitle]);

  useEffect(() => {
    if (!paperKey) return;
    let ignore = false;
    listComments(paperKey)
      .then((data) => {
        if (!ignore) {
          setCommentState({ paperKey, status: "ready", comments: data.comments });
        }
      })
      .catch(() => {
        if (!ignore) {
          setCommentState({ paperKey, status: "error", comments: [] });
        }
      });
    return () => {
      ignore = true;
    };
  }, [paperKey]);

  if (!found || !paper || !edition) return <Navigate to="/" replace />;

  const threadId = paper.arxivId;
  const saved = saves.includes(paper.id) || saves.includes(paper.arxivId);
  const onDiscussion = location.pathname.endsWith("/discussion");
  const evidence = listingDetail(paper);
  const desk = account?.workingOn ?? "";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const data = await postComment(threadId, body);
      setCommentState((prev) => ({
        paperKey,
        status: "ready",
        comments: prev.paperKey === paperKey ? [...prev.comments, data.comment] : [data.comment],
      }));
      setFreshId(data.comment.id);
      setDraft("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(label);
    } catch {
      toast("Copy failed");
    }
  }

  const pdf = safePaperUrl(paper.url);
  const code = safeGithubUrl(paper.github);
  const source = evidence ? safePaperUrl(evidence.href) : undefined;

  const actions = (
    <>
      {pdf ? (
        <a className="btn primary" href={pdf} target="_blank" rel="noreferrer">
          Read paper
        </a>
      ) : null}
      {code ? (
        <a className="btn" href={code} target="_blank" rel="noreferrer">
          <IconGit /> Code
        </a>
      ) : null}
      <button
        type="button"
        className={saved ? "btn on" : "btn"}
        onClick={() => void toggleSave(paper.arxivId)}
      >
        {saved ? (
          <span key="saved" className="btn-face">
            Saved
          </span>
        ) : (
          <span key="save" className="btn-face">
            Save
          </span>
        )}
      </button>
    </>
  );

  const paperActions = (
    <div className="paper-actions">
      {actions}
      <details className="agent-more">
        <summary className="btn">More</summary>
        <div className="menu-pop">
          <button type="button" onClick={() => copy("Packet copied", paperMarkdown(paper))}>
            Copy board packet
          </button>
          <button type="button" onClick={() => copy("JSON copied", paperJson(paper))}>
            Copy JSON
          </button>
          <button
            type="button"
            onClick={() => copy("Prompt copied", paperAgentPrompt(paper, desk))}
          >
            Copy agent prompt
          </button>
          <button
            type="button"
            onClick={() => copy("Link copied", window.location.origin + `/p/${paper.id}`)}
          >
            Copy link
          </button>
        </div>
      </details>
    </div>
  );

  const paperTabs = (
    <nav className="tabs paper-tabs" aria-label="Paper sections">
      <NavLink to={`/p/${paper.id}`} end>
        Host packet
      </NavLink>
      <NavLink to={`/p/${paper.id}/discussion`}>
        Discussion{comments.length ? <em>{comments.length}</em> : null}
      </NavLink>
    </nav>
  );

  return (
    <div className="subpage paper-layout">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Board</Link>
        <span>/</span>
        <span>{paper.topic}</span>
      </nav>

      <article className="sheet">
        <header className="sheet-head">
          <p className="sheet-meta">
            <span>{edition.label}</span>
            <span>{paper.topic}</span>
            <span>{paper.arxivId}</span>
          </p>
          <h1>{paper.title}</h1>
          <div className="sheet-byline">
            <span>{listingLine(paper)} <span aria-hidden="true">·</span></span>
            <AuthorList authors={paper.authors} visible={4} />
          </div>
          {paper.trend ? <TrendMark trend={paper.trend} /> : null}
        </header>
        {evidence || paper.automation ? (
          <p className="paper-provenance" aria-label="Board provenance">
            {paper.automation ? <strong>Board {String(paper.automation.rank).padStart(2, "0")}</strong> : null}
            {evidence ? <span>{evidence.sourceName}</span> : null}
            {paper.automation ? (
              <span className="provenance-basis">
                {paper.automation.packetBasis === "full-paper"
                  ? "Full-paper review"
                  : "Title + abstract packet"}
              </span>
            ) : null}
            {source ? (
              <a href={source} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            ) : null}
          </p>
        ) : null}
        {paperTabs}
        {onDiscussion ? (
          <>
            <section className="discussion-section" id="discussion">
            <header className="discussion-head">
              <h2>Reader notes</h2>
            </header>
            {commentsStatus === "loading" ? (
              <p className="empty" role="status" aria-live="polite">Loading…</p>
            ) : commentsStatus === "error" ? (
              <p className="form-error" role="status">
                Reader notes unavailable. Try again.
              </p>
            ) : comments.length === 0 ? (
              <p className="empty">No notes yet.</p>
            ) : (
              <ul className="thread">
                {comments.map((comment) => (
                  <li
                    key={comment.id}
                    className={comment.id === freshId ? "fresh" : undefined}
                  >
                    <span className="comment-meta">
                      {comment.userId ? (
                        <Link to={`/u/${comment.author}`}>{comment.author}</Link>
                      ) : (
                        comment.author
                      )}
                      {comment.createdAt ? (
                        <time
                          dateTime={comment.createdAt}
                          title={fullCommentTime(comment.createdAt)}
                        >
                          {formatCommentTime(comment.createdAt)}
                        </time>
                      ) : null}
                    </span>
                    {comment.body}
                  </li>
                ))}
              </ul>
            )}
            {account ? (
              <form className="composer" onSubmit={onSubmit}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Add a reader note"
                  aria-label="Add a reader note"
                  maxLength={2000}
                  rows={3}
                />
                <button
                  type="submit"
                  className="btn"
                  disabled={posting || !draft.trim()}
                >
                  {posting ? (
                    <span key="posting" className="btn-face">
                      Posting…
                    </span>
                  ) : (
                    <span key="post" className="btn-face">
                      Post
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <p className="gate">
                <Link to={`/login?next=/p/${paper.id}/discussion`}>Sign in</Link> to add a reader note.
              </p>
            )}
            </section>
            {paperActions}
          </>
        ) : (
          <>
            <HostBrief paper={paper} showBasis={false} />
            {paperActions}
          </>
        )}
      </article>
    </div>
  );
}

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return "Just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
