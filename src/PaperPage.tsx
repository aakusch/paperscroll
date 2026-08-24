import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Navigate, useLocation, useParams } from "react-router-dom";
import { listComments, postComment, type ThreadComment } from "./api";
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
          <p className="sheet-byline">
            {paper.authors}
            <span>{listingLine(paper)}</span>
          </p>
          {paper.trend ? <TrendMark trend={paper.trend} /> : null}
        </header>
        {evidence ? (
          <p className="evidence">
            <strong>{evidence.label}.</strong> {evidence.text}{" "}
            {source ? (
              <a href={source} target="_blank" rel="noreferrer">
                Source
              </a>
            ) : null}
          </p>
        ) : null}
        {paper.automation ? (
          <p className="evidence">
            <strong>Board #{paper.automation.rank}.</strong> {paper.automation.reason}. The
            packet below is constrained to the authors’ title and abstract; verify the PDF
            before relying on details.
          </p>
        ) : null}
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
                onClick={() =>
                  copy("Link copied", window.location.origin + `/p/${paper.id}`)
                }
              >
                Copy link
              </button>
            </div>
          </details>
        </div>

        <HostBrief paper={paper} />

        {onDiscussion ? (
          <section className="discussion-section" id="discussion">
            <header className="discussion-head">
              <div>
                <p className="sheet-kicker">Discussion</p>
                <h2>Caveats, replications, and useful artifacts</h2>
              </div>
              <NavLink to={`/p/${paper.id}`} end>Close</NavLink>
            </header>
            {commentsStatus === "loading" ? (
              <p className="empty">Loading reader notes…</p>
            ) : commentsStatus === "error" ? (
              <p className="form-error" role="status">
                Reader notes are unavailable. The board packet above is unaffected.
              </p>
            ) : comments.length === 0 ? (
              <p className="empty">
                No reader notes yet. Add something only if it helps test or use
                the board packet.
              </p>
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
                  placeholder="Add a caveat, replication note, or useful artifact"
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
                <Link to="/signup">Sign in</Link> to leave a note.
              </p>
            )}
          </section>
        ) : (
          <Link className="discussion-entry" to={`/p/${paper.id}/discussion`}>
            <span>Reader discussion{comments.length ? ` · ${comments.length}` : ""}</span>
            <small>Caveats, replications, and useful artifacts only.</small>
          </Link>
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
