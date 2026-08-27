import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  useSearchParams,
} from "react-router-dom";
import PaperPage from "./PaperPage";
import { compactAuthors } from "./authorFormat";
import {
  AccountPage,
  AgentPage,
  AboutPage,
  SavedPage,
  LoginPage,
  PublicProfilePage,
  SignupPage,
} from "./pages";
import { RoutinePage, RoutineStart } from "./RoutinePage";
import { FIELDS, catalog, type Edition, type Paper, type Topic } from "./data";
import { packetLead } from "./lead";
import { listingLine, shortDate } from "./listing";
import { beginRouteMotion } from "./motion";
import { PaperPreview } from "./PaperPreview";
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
      <nav className="nav" aria-label="Primary">
        <Link to="/" className="logo">
          <img src="/favicon.png" width="32" height="32" alt="" />
          <span className="logo-copy">
            <strong>PaperScroll</strong>
            <small>Research briefing</small>
          </span>
        </Link>
        <div className="nav-links">
          <p className="nav-label">Read</p>
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
          <p className="nav-label nav-label-spaced">Workspace</p>
          <NavLink to="/saved">Saved{laterCount ? ` (${laterCount})` : ""}</NavLink>
          <NavLink to="/agent">Agent routing</NavLink>
          <p className="nav-label nav-label-spaced">PaperScroll</p>
          <NavLink to="/about">About</NavLink>
        </div>
        <div className="nav-foot">
          <span className="nav-foot-label">Your workspace</span>
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
      </nav>
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
  priority,
}: {
  paper: Paper;
  saved?: boolean;
  priority?: boolean;
}) {
  const authors = compactCardAuthors(paper.authors);
  const lead = packetLead(paper, true);
  const appeared = paper.listing
    ? shortDate(paper.listing.publishedOn)
    : listingLine(paper);

  return (
    <Link to={`/p/${paper.id}`} className="paper">
      <PaperPreview paper={paper} priority={priority} />
      <span className="paper-copy">
        <span className="paper-kicker">
          <span>{paper.topic}</span>
        </span>
        <h3>{paper.title}</h3>
        <span className="byline">
          {appeared} · <span>{authors}</span>{saved ? " · Saved" : ""}
        </span>
        {lead ? (
          <span className="host-line">
            {lead.kind === "verdict" ? (
              <>
                <span className={`host-verdict v-${lead.verdict.toLowerCase()}`}>
                  {lead.verdict}
                </span>{" "}
                {lead.text}
              </>
            ) : (
              lead.text
            )}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function compactCardAuthors(authors: string) {
  return compactAuthors(authors, 1);
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
          <p className="sheet-kicker">Fields</p>
          <h1>Order your board</h1>
        </header>
        <p className="lede">
          Fields reorder the shared board. No papers are hidden.
        </p>
        <p className="pref-label">
          {picks.length
            ? `${picks.length} selected`
            : "Select fields"}
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
          <span className="working-title">Desk context <em>Optional</em></span>
          <span className="working-hint">
            Included in Agent routing.
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
            Show all fields
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
  const [searchParams, setSearchParams] = useSearchParams();
  const loadMoreRef = useRef<HTMLSpanElement>(null);
  const manualLoadRef = useRef<HTMLButtonElement>(null);

  const boardDate = dateParam ?? latestBoard;
  const dayIndex = boardDates.indexOf(boardDate);
  const source = catalog.find((edition) => edition.date === boardDate);
  const availableCount = dayIndex < 0 ? 0 : catalog.length - dayIndex;
  const continuous = !dateParam && searchParams.get("view") === "continuous";
  const throughIndex = catalog.findIndex((edition) => edition.date === searchParams.get("through"));
  const requestedCount = continuous && throughIndex >= dayIndex
    ? throughIndex - dayIndex + 1
    : 2;
  const continuousCount = continuous
    ? Math.max(1, Math.min(requestedCount, availableCount || 1))
    : 1;

  const days = useMemo(() => {
    if (dayIndex < 0) return [];
    const count = continuous ? continuousCount : 1;
    return catalog.slice(dayIndex, dayIndex + count).map((edition) => ({
      ...edition,
      ...composeBoard([...edition.papers], prefs),
    }));
  }, [continuous, continuousCount, dayIndex, prefs]);

  const loadOlder = useCallback(() => {
    const nextCount = Math.min(continuousCount + 1, availableCount);
    if (!continuous || nextCount <= continuousCount) return;
    const through = catalog[dayIndex + nextCount - 1]?.date;
    if (through) {
      const next = new URLSearchParams(searchParams);
      next.set("view", "continuous");
      next.set("through", through);
      setSearchParams(next, { replace: true });
    }
  }, [availableCount, continuous, continuousCount, dayIndex, searchParams, setSearchParams]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!continuous || !target || continuousCount >= availableCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          document.activeElement !== manualLoadRef.current &&
          entries.some((entry) => entry.isIntersecting)
        ) loadOlder();
      },
      { rootMargin: "96px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [availableCount, continuous, continuousCount, loadOlder]);

  const day = days[0];
  if (!source || !day || dayIndex < 0) return <Navigate to="/" replace />;

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
    window.scrollTo(0, 0);
    window.setTimeout(cleanup, 280);
  }

  function openCanonicalBoard(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) return;
    window.scrollTo(0, 0);
  }

  return (
    <div className="feed-page">
      <header className="feed-head">
        <h1 className="feed-title">The board</h1>
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
      {isLatestHosted && !isToday ? (
        <p className="board-note board-note-stale">
          {fullDayLabel(today)} is not ready. Showing {day.label}.
        </p>
      ) : null}

      <div className="board-browser">
        {continuous ? (
          <p className="when-solo">
            From{" "}
            <Link
              id={`board-date-${day.date}`}
              to={boardPath(day.date)}
              onClick={openCanonicalBoard}
            >
              {day.label}
            </Link>
          </p>
        ) : boardDates.length > 1 ? (
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
          <p className="when-solo">{day.label} · {day.papers.length} papers</p>
        )}
        {!dateParam ? (
          <label className="continuous-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={continuous}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.checked) {
                  next.set("view", "continuous");
                  const through = catalog[Math.min(dayIndex + 1, catalog.length - 1)]?.date;
                  if (through) next.set("through", through);
                } else {
                  next.delete("view");
                  next.delete("through");
                }
                setSearchParams(next);
              }}
            />
            Infinite scroll
          </label>
        ) : null}
      </div>

      <div className="board-stream">
        {days.map((streamDay, index) => (
          <div className="stream-day" key={streamDay.date}>
            {continuous && index > 0 ? (
              <h2 className="stream-day-label" id={`board-date-${streamDay.date}`}>
                <Link to={boardPath(streamDay.date)} onClick={openCanonicalBoard}>
                  {streamDay.label}
                </Link>
                <span>{streamDay.papers.length} papers</span>
              </h2>
            ) : null}
            <BoardCards
              day={streamDay}
              saves={saves}
              isToday={streamDay.date === today}
              priority={index === 0}
              labelledBy={continuous ? `board-date-${streamDay.date}` : undefined}
            />
          </div>
        ))}
      </div>
      {continuous ? (
        <div className="stream-sentinel">
          {continuousCount < availableCount ? (
            <span ref={loadMoreRef} className="stream-observer" aria-hidden="true" />
          ) : null}
          <button
            ref={manualLoadRef}
            type="button"
            className="quiet-link"
            aria-disabled={continuousCount >= availableCount}
            onClick={loadOlder}
          >
            {continuousCount >= availableCount
              ? "All boards loaded"
              : "Load older boards"}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {continuousCount >= availableCount
              ? `All ${days.length} complete mornings loaded`
              : `${days.length} mornings loaded`}
          </span>
        </div>
      ) : null}
    </div>
  );
}

type ComposedEdition = Edition & ReturnType<typeof composeBoard>;

function BoardCards({
  day,
  saves,
  isToday,
  priority,
  labelledBy,
}: {
  day: ComposedEdition;
  saves: string[];
  isToday: boolean;
  priority: boolean;
  labelledBy?: string;
}) {
  if (day.focus.length + day.rest.length === 0) {
    return (
      <div className="empty-card">
        <h2>No board for this date</h2>
        <p>Try another date.</p>
      </div>
    );
  }

  return (
    <section
      className="day"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : `${day.label} board`}
    >
      {day.focus.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          saved={saves.includes(paper.id) || saves.includes(paper.arxivId)}
          priority={priority}
        />
      ))}
      {day.rest.length > 0 ? (
        <>
          <h2 className="also">{isToday ? "Also today" : "Also this board"}</h2>
          {day.rest.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              saved={saves.includes(paper.id) || saves.includes(paper.arxivId)}
              priority={priority}
            />
          ))}
        </>
      ) : null}
    </section>
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
        <h1>Page not found</h1>
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
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/u/:name" element={<PublicProfilePage />} />
          <Route path="/newsletter" element={<Navigate to="/agent" replace />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/later" element={<Navigate to="/saved" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
