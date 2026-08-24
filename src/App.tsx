import { useLayoutEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import PaperPage from "./PaperPage";
import { compactAuthors } from "./authorFormat";
import {
  AccountPage,
  AboutPage,
  SavedPage,
  LoginPage,
  PublicProfilePage,
  SignupPage,
} from "./pages";
import { RoutinePage, RoutineStart } from "./RoutinePage";
import { FIELDS, catalog, type Paper, type Topic } from "./data";
import { listingLine, shortDate } from "./listing";
import { beginRouteMotion } from "./motion";
import { PaperPreview } from "./PaperPreview";
import { TrendMark } from "./Trend";
import {
  composeBoard,
  prefsFromUser,
  type Prefs,
} from "./rank";
import { SessionProvider } from "./session";
import { useSession } from "./session-context";
import { Toaster } from "sonner";

export type AppContext = {
  prefs: Prefs;
};

const boardDates = catalog.map((edition) => edition.date);
const latestBoard = boardDates[0];

function newYorkDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function fullDayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function boardPath(date: string) {
  return date === latestBoard ? "/" : `/d/${date}`;
}

function Shell() {
  const location = useLocation();
  const onRoutine = location.pathname.startsWith("/routine");
  const onFeed =
    location.pathname === "/" || location.pathname.startsWith("/d/");
  const { account, saves, error } = useSession();
  const prefs = prefsFromUser(account);

  const laterCount = saves.length;
  const onWelcome = location.pathname === "/welcome";

  if (onRoutine) {
    return (
      <div className="routine-shell">
        <Outlet context={{ prefs } satisfies AppContext} />
      </div>
    );
  }

  return (
    <div className={onFeed || onWelcome ? "app" : "app reading"}>
      <aside className="nav">
        <Link to="/" className="logo">
          PaperScroll
          <span>Catch up over coffee</span>
        </Link>
        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive || location.pathname.startsWith("/d/")
                ? "active"
                : undefined
            }
          >
            The board
          </NavLink>
          <NavLink to="/saved">Saved{laterCount ? ` (${laterCount})` : ""}</NavLink>
          <NavLink to="/about">About</NavLink>
        </div>
        <div className="nav-foot">
          {account ? (
            <NavLink to="/account" className="nav-user">
              <span className="nav-user-mark" aria-hidden="true">
                {account.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="nav-user-name">{account.name}</span>
            </NavLink>
          ) : (
            <NavLink to="/login" className="nav-user nav-user-guest">
              Sign in
            </NavLink>
          )}
        </div>
      </aside>
      <div className="main">
        {error ? (
          <p className="session-warning" role="status">
            {error}
          </p>
        ) : null}
        <Outlet context={{ prefs } satisfies AppContext} />
      </div>
    </div>
  );
}

function PaperCard({
  paper,
  saved,
}: {
  paper: Paper;
  saved?: boolean;
}) {
  const rank = paper.automation?.rank;
  const authors = compactCardAuthors(paper.authors);
  const boardHook = paper.plain?.verdictWhy || paper.verdictWhy;

  return (
    <Link to={`/p/${paper.id}`} className="paper">
      <PaperPreview paper={paper} />
      <span className="paper-copy">
        <span className="paper-kicker">
          <span>{paper.topic}</span>
          {rank ? <span className="paper-rank">Board {String(rank).padStart(2, "0")}</span> : null}
        </span>
        <h3>{paper.title}</h3>
        <span className="byline">
          {listingLine(paper)} · <span>{authors}</span>
        </span>
        <span className="host-line">
          <span className={`host-verdict v-${paper.verdict.toLowerCase()}`}>
            {paper.verdict}
          </span>{" "}
          {boardHook}
        </span>
        {paper.trend || saved ? (
          <span className="metrics">
            {paper.trend ? <TrendMark trend={paper.trend} /> : null}
            {saved ? <span>Saved</span> : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function compactCardAuthors(authors: string) {
  return compactAuthors(authors, 2);
}

function WelcomePage() {
  const { account, ready } = useSession();
  const { prefs } = useOutletContext<AppContext>();

  if (!ready) {
    return <CompactState kicker="Fields" title="Loading your board…" />;
  }

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  return (
    <WelcomeForm
      key={`${account.id}:${prefs.interests.join(",")}:${prefs.workingOn}`}
      prefs={prefs}
    />
  );
}

function WelcomeForm({ prefs }: { prefs: Prefs }) {
  const { savePrefs, toast } = useSession();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Topic[]>(prefs.interests);
  const [workingOn, setWorkingOn] = useState(prefs.workingOn);
  const [busy, setBusy] = useState(false);

  function toggle(id: Topic) {
    setPicks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function finish(interests: Topic[]) {
    setBusy(true);
    try {
      await savePrefs({ interests, workingOn: workingOn.trim() });
      navigate("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save fields");
    } finally {
      setBusy(false);
    }
  }

  const returning = prefs.interests.length > 0 || Boolean(prefs.workingOn);

  return (
    <div className="subpage welcome">
      <article className="sheet">
        <header className="sheet-head">
          <p className="sheet-kicker">{returning ? "Fields" : "Your board"}</p>
          <h1>
            {returning ? "What sits first?" : "What are you catching up on?"}
          </h1>
        </header>
        <p className="lede">
          {returning
            ? "Everyone still gets the same ten. Your fields only change the order, not what exists. Saved on your profile."
            : "Everyone still gets the same day. Your fields just start at the top. The rest of the board stays below. This lives on your account, not this browser."}
        </p>
        <p className="pref-label">
          {picks.length
            ? `${picks.length} field${picks.length === 1 ? "" : "s"} selected`
            : "Pick fields you actually read, or show everything."}
        </p>
        <div className="field-grid">
          {FIELDS.map((field) => (
            <button
              key={field.id}
              type="button"
              className={picks.includes(field.id) ? "field on" : "field"}
              onClick={() => toggle(field.id)}
            >
              <strong>{field.id}</strong>
              <span>{field.blurb}</span>
            </button>
          ))}
        </div>
        <label className="working-label">
          Optional — what you’re working on
          <span className="working-hint">
            Adds context to your digest. It never changes the shared board.
          </span>
          <input
            value={workingOn}
            onChange={(e) => setWorkingOn(e.target.value)}
            placeholder="evals, conformal, EHR…"
            maxLength={200}
          />
        </label>
        <div className="sheet-mark">
          <button
            type="button"
            className="btn primary"
            disabled={busy || picks.length === 0}
            onClick={() => void finish(picks)}
          >
            {returning ? "Save fields" : "See today’s board"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void finish([])}
          >
            Show everything first
          </button>
        </div>
      </article>
    </div>
  );
}

function FeedPage() {
  const { date: dateParam } = useParams();
  const { prefs } = useOutletContext<AppContext>();
  const { account, saves } = useSession();
  const navigate = useNavigate();

  const boardDate = dateParam ?? latestBoard;
  const dayIndex = boardDates.indexOf(boardDate);
  const source = catalog.find((edition) => edition.date === boardDate);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [boardDate]);

  const day = useMemo(() => {
    if (!source) return null;
    const papers = [...source.papers];
    const { focus, rest } = composeBoard(papers, prefs);
    return { ...source, focus, rest };
  }, [prefs, source]);

  if (!source || !day || dayIndex < 0) return <Navigate to="/" replace />;

  const allFields = prefs.interests.length === 0;
  const today = newYorkDate();
  const isToday = boardDate === today;
  const isLatestHosted = boardDate === latestBoard;
  const newer = dayIndex > 0 ? boardDates[dayIndex - 1] : null;
  const older =
    dayIndex < boardDates.length - 1 ? boardDates[dayIndex + 1] : null;

  function changeBoard(
    event: MouseEvent<HTMLAnchorElement>,
    target: string,
    mode: "board-newer" | "board-older",
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      event.detail === 0
    ) return;
    const cleanup = beginRouteMotion(mode);
    if (!cleanup) return;
    event.preventDefault();
    navigate(boardPath(target), { viewTransition: true });
    window.setTimeout(cleanup, 280);
  }

  return (
    <div className="feed-page">
      <header className="feed-head">
        <div>
          <p className="feed-kicker">
            {isToday ? "Today" : isLatestHosted ? "Last board" : "Archive"}
          </p>
          <h1 className="feed-title">The board</h1>
        </div>
        <div className="feed-actions">
          {day.papers.length ? (
            <Link className="btn primary" to={`/routine/${boardDate}/1`}>
              Start routine
            </Link>
          ) : null}
          {account ? (
            <Link to="/welcome" className="quiet-link">
              Change fields
            </Link>
          ) : (
            <Link to="/login" className="quiet-link">
              Sign in to set fields
            </Link>
          )}
        </div>
      </header>
      <p
        className={
          isLatestHosted && !isToday
            ? "board-note board-note-stale"
            : "board-note"
        }
      >
        {isLatestHosted && !isToday
          ? `No complete board is ready for ${fullDayLabel(today)}. Showing the latest finished board.`
          : day.selection
            ? `One shared top ten from ${day.poolSize ?? "the"} eligible papers. Source signal plus field coverage chooses membership; your fields only change the order.`
          : allFields
            ? "One shared board. Card dates are when each paper first appeared."
            : `${prefs.interests.join(", ")} first. Same top ten as everyone.`}
      </p>

      {boardDates.length > 1 ? (
      <nav className="day-pager" aria-label="Board date">
        {newer ? (
          <Link
            to={boardPath(newer)}
            aria-label={`Newer board, ${fullDayLabel(newer)}`}
            onClick={(event) => changeBoard(event, newer, "board-newer")}
          >
            ← {shortDate(newer)}
          </Link>
        ) : (
          <span className="dead">Latest</span>
        )}
        <span className="when">
          {day.label} · {day.papers.length} papers
        </span>
        {older ? (
          <Link
            to={boardPath(older)}
            aria-label={`Older board, ${fullDayLabel(older)}`}
            onClick={(event) => changeBoard(event, older, "board-older")}
          >
            {shortDate(older)} →
          </Link>
        ) : (
          <span className="dead">Oldest</span>
        )}
      </nav>
      ) : (
        <p className="when-solo">
          {day.label} · {day.papers.length} papers
        </p>
      )}

      {day.focus.length + day.rest.length === 0 ? (
        <div className="empty-card">
          <h2>No complete board is ready</h2>
          <p>Selection and all ten packets publish atomically. Try an older morning.</p>
        </div>
      ) : (
        <section className="day">
          {day.focus.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              saved={saves.includes(paper.id) || saves.includes(paper.arxivId)}
            />
          ))}
          {day.rest.length > 0 ? (
            <>
              <h2 className="also">
                {isToday ? "Also today" : "Also this board"}
              </h2>
              {day.rest.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  saved={saves.includes(paper.id) || saves.includes(paper.arxivId)}
                />
              ))}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}

function CompactState({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="subpage auth-page">
      <article className="sheet auth-sheet">
        <p className="sheet-kicker">{kicker}</p>
        <h1>{title}</h1>
      </article>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="subpage auth-page">
      <article className="sheet auth-sheet">
        <p className="sheet-kicker">Not found</p>
        <h1>That page isn’t on today’s board.</h1>
        <p className="lede"><Link to="/">Return to the board</Link></p>
      </article>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Toaster
        theme="dark"
        position="bottom-center"
        duration={2200}
        offset={24}
        toastOptions={{ className: "ps-toast" }}
      />
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/d/:date" element={<FeedPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/routine" element={<RoutineStart />} />
          <Route path="/routine/:date/:step" element={<RoutinePage />} />
          <Route path="/p/:id" element={<PaperPage />} />
          <Route path="/p/:id/discussion" element={<PaperPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/u/:name" element={<PublicProfilePage />} />
          <Route path="/newsletter" element={<Navigate to="/account" replace />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/later" element={<Navigate to="/saved" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
