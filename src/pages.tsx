import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createToken,
  getPublicProfile,
  listTokens,
  revokeToken,
  type DigestToken,
  type PublicProfile,
  type User,
} from "./api";
import { AuthorList } from "./Authors";
import { catalog } from "./data";
import { IconLinkedIn, IconX } from "./icons";
import { passwordStrength } from "./identity";
import { useSession } from "./session-context";
import { useUsernameAvailability } from "./useUsername";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AboutPage() {
  return (
    <div className="subpage about-page">
      <article className="sheet about-sheet">
        <header className="sheet-head">
          <p className="sheet-kicker">About</p>
          <h1>Catch up over coffee</h1>
        </header>
        <p className="lede">One shared morning board of up to ten research papers.</p>

        <div className="about-sections">
        <section className="block">
          <h2>Shared board</h2>
          <p className="brief-p">
            Everyone sees the same papers. Fields reorder them; saves do not
            affect the board.
          </p>
        </section>

        <section className="block">
          <h2>Selection</h2>
          <p className="brief-p">
            A stable, field-balanced ranking selects up to ten from the current intake.
            Source signal, recency, and field coverage set the order; account
            data does not set membership.
          </p>
        </section>

        <section className="block">
          <h2>Host packet</h2>
          <p className="brief-p">
            Every paper reports what its authors claim, with the figures they
            state, a brief, takeaways, and next actions. It does not tell you
            whether to read it: the board is one shared cut and does not know
            your desk. Its review basis is labelled title + abstract or full
            paper, and a board publishes only after every packet validates.
          </p>
        </section>

        <section className="block">
          <h2>Dates</h2>
          <p className="brief-p">
            The board date is its morning edition, not a PDF’s first appearance.
            Published boards are frozen.
          </p>
        </section>

        <section className="block">
          <h2>Agent routing</h2>
          <p className="brief-p">
            A read-only token gives an outside agent the latest complete host
            packets in field-first order, with retry and deduplication keys and
            no raw abstracts. The outside runtime owns scheduling and ingestion.
          </p>
        </section>
        </div>

        <p className="about-foot">
          <Link to="/">See today’s board</Link>
          {" · "}
          <Link to="/routine">Start the routine</Link>
        </p>
      </article>
    </div>
  );
}

export function SignupPage() {
  const { account, signup } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nameCheck = useUsernameAvailability(name);
  const strength = passwordStrength(password, { username: name, email });

  if (account) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 10) return;
    if (nameCheck.status === "taken" || nameCheck.status === "invalid") {
      setError(nameCheck.hint || "That username is already taken.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signup(name.trim(), email.trim(), password, confirm, false);
      navigate("/welcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create account"
      aside={
        <>
          Already here? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Username
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            autoComplete="username"
            spellCheck={false}
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z][A-Za-z0-9_]{2,23}"
            title="Start with a letter, then letters, numbers, or underscore"
            required
            aria-invalid={
              nameCheck.status === "taken" || nameCheck.status === "invalid" || undefined
            }
          />
          <span
            className={
              nameCheck.status === "taken" || nameCheck.status === "invalid"
                ? "form-error"
                : nameCheck.status === "free"
                  ? "form-ok"
                  : "form-note"
            }
          >
            {nameCheck.hint || "3–24 characters. Letters, numbers, underscore."}
          </span>
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
          />
          <div
            className={`pw-meter s-${strength.score}`}
            aria-live="polite"
          >
            <span className="pw-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              {password
                ? strength.label
                : "10+ characters, with a letter and a number."}
            </span>
          </div>
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (error) setError("");
            }}
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            aria-invalid={Boolean(confirm) && confirm !== password}
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="btn primary"
          type="submit"
          disabled={
            busy ||
            nameCheck.status === "taken" ||
            nameCheck.status === "checking" ||
            nameCheck.status === "invalid"
          }
        >
          {busy ? (
            <span key="creating" className="btn-face">
              Creating…
            </span>
          ) : (
            <span key="create" className="btn-face">
              Create account
            </span>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

export function LoginPage() {
  const { account, login } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (account) return <Navigate to={nextPath} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      aside={
        <>
          New here? <Link to="/signup">Create account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? (
            <span key="signing" className="btn-face">
              Signing in…
            </span>
          ) : (
            <span key="signin" className="btn-face">
              Sign in
            </span>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

export function AccountPage() {
  const { account, ready } = useSession();
  const [searchParams] = useSearchParams();

  if (searchParams.get("view") === "agent") {
    return <Navigate to="/agent" replace />;
  }

  if (!ready) {
    return (
      <AuthCard title="Checking your session…">{null}</AuthCard>
    );
  }
  if (!account) return <Navigate to="/login" replace />;

  return (
    <AccountForm
      key={`${account.id}:${account.name}:${account.bio}:${account.x}:${account.linkedin}`}
      account={account}
    />
  );
}

function AccountForm({ account }: { account: User }) {
  const { logout, saveProfile, toast } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState(account.name);
  const [bio, setBio] = useState(account.bio ?? "");
  const [x, setX] = useState(account.x ?? "");
  const [linkedin, setLinkedin] = useState(account.linkedin ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nameCheck = useUsernameAvailability(name, account.name);

  const joined = formatJoined(account.joinedAt);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (nameCheck.status === "taken" || nameCheck.status === "invalid") {
      setError(nameCheck.hint || "That username is already taken.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveProfile({
        name: name.trim(),
        bio: bio.trim(),
        x: x.trim(),
        linkedin: linkedin.trim(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save profile";
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      kicker="Account"
      title={account.name}
      aside={joined ? `Joined ${joined}` : undefined}
    >
      <section className="account-panel">
          <nav className="profile-nav">
            <Link to={`/u/${account.name}`}>Public profile</Link>
            <Link to="/welcome">Change fields</Link>
          </nav>

          <div className="account-composition">
            <strong>Board order</strong>
            <span>
              {account.interests.length ? account.interests.join(", ") : "All fields"}
              {account.workingOn ? ` · Desk: ${account.workingOn}` : ""}
            </span>
          </div>

          <form className="auth-form" onSubmit={onSave}>
            <label>
              Username
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="username"
                spellCheck={false}
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z][A-Za-z0-9_]{2,23}"
                title="Start with a letter, then letters, numbers, or underscore"
                required
                aria-invalid={
                  nameCheck.status === "taken" || nameCheck.status === "invalid" || undefined
                }
              />
              <span
                className={
                  nameCheck.status === "taken" || nameCheck.status === "invalid"
                    ? "form-error"
                    : nameCheck.status === "free" && nameCheck.hint
                      ? "form-ok"
                      : "form-note"
                }
              >
                {nameCheck.hint || "Shown on comments and your public profile."}
              </span>
            </label>
            <label>
              Email
              <input type="email" value={account.email} readOnly autoComplete="email" />
              <span className="form-note">Private · used to sign in</span>
            </label>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <label>
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Short public bio"
              />
            </label>
            <label>
              X
              <input
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="@handle or x.com/…"
                autoComplete="off"
              />
            </label>
            <label>
              LinkedIn
              <input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="linkedin.com/in/…"
                autoComplete="off"
              />
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={
                busy ||
                nameCheck.status === "taken" ||
                nameCheck.status === "checking" ||
                nameCheck.status === "invalid"
              }
            >
              {busy ? (
                <span key="saving" className="btn-face">
                  Saving…
                </span>
              ) : (
                <span key="save" className="btn-face">
                  Save profile
                </span>
              )}
            </button>
          </form>
      </section>

      <div className="sheet-mark">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void logout().then(() => navigate("/"));
          }}
        >
          Sign out
        </button>
      </div>
    </AuthCard>
  );
}

export function AgentPage() {
  const { account, ready } = useSession();

  if (!ready) {
    return (
      <AuthCard kicker="Agent routing" title="Checking your session…">{null}</AuthCard>
    );
  }
  if (!account) {
    return (
      <AuthCard kicker="Agent routing" title="Connect an agent">
        <p className="lede">Sign in to create a read-only digest token.</p>
        <p className="sheet-mark">
          <Link className="btn primary" to="/login?next=/agent">Sign in</Link>
          <Link className="btn" to="/signup">Create account</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <div className="subpage agent-page">
      <article className="sheet agent-sheet">
        <header className="sheet-head">
          <p className="sheet-kicker">Agent routing</p>
          <h1>Morning route</h1>
        </header>
        <AgentDigest />
      </article>
    </div>
  );
}

function AgentDigest() {
  const { toast } = useSession();
  const [tokens, setTokens] = useState<DigestToken[]>([]);
  const [tokensStatus, setTokensStatus] = useState<"loading" | "ready" | "error">("loading");
  const [secret, setSecret] = useState<{ id: string; value: string } | null>(null);
  const [label, setLabel] = useState("Morning agent");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void listTokens()
      .then((data) => {
        if (live) {
          setTokens(data.tokens);
          setTokensStatus("ready");
        }
      })
      .catch(() => {
        if (live) {
          setTokensStatus("error");
        }
      });
    return () => {
      live = false;
    };
  }, [toast]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const digestUrl = `${origin}/api/v1/digest/latest`;
  const schemaUrl = `${origin}/schemas/digest-v1.json`;
  const routingPrompt = `Once each weekday after PaperScroll publishes its morning board:
1. GET ${digestUrl} with Authorization: Bearer <PAPERSCROLL_TOKEN>, Accept: application/json, and the last ETag in If-None-Match.
2. On 304, stop. There is no new composed board for this route.
3. On 200, require schema=paperscroll.digest, schemaVersion=1.1, board.complete=true, and board.count=10.
4. Process delivery.key only if it has not already succeeded. Use the host packet; never substitute an author's abstract. Map useful papers onto the current workspace without inventing methods, numbers, artifacts, or GitHub URLs.
5. After successful ingestion, persist delivery.key and the response ETag.`;
  const curlExample = `curl --fail-with-body \\
  -H "Authorization: Bearer $PAPERSCROLL_TOKEN" \\
  -H "Accept: application/json" \\
  "${digestUrl}"`;

  async function mint() {
    setBusy(true);
    try {
      const created = await createToken(label);
      setSecret({ id: created.id, value: created.token });
      setTokens((prev) => [{ ...created }, ...prev]);
      toast("Token created. Copy it now — it won’t be shown again.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create token.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await revokeToken(id);
      setTokens((prev) => prev.filter((item) => item.id !== id));
      setSecret((current) => (current?.id === id ? null : current));
      toast("Token revoked.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not revoke token.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, ok: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(ok);
    } catch {
      toast("Copy failed.");
    }
  }

  return (
    <section className="digest-panel">
      <p>
        Create a read-only token, then schedule one weekday GET. The endpoint
        returns the latest complete host packets in your field order, with your
        desk context; your runtime handles ingestion.
      </p>
      <ol className="routing-steps">
        <li><span>1</span><p>Create a <code>digest:read</code> token.</p></li>
        <li><span>2</span><p>Schedule a weekday GET with the last ETag.</p></li>
        <li><span>3</span><p>On <code>200</code>, process each <code>delivery.key</code> once. On <code>304</code>, stop.</p></li>
      </ol>
      <label className="digest-url token-label">
        Token name
        <input
          value={label}
          maxLength={60}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Morning agent"
        />
      </label>
      <div className="digest-actions token-create">
        <button
          type="button"
          className="btn primary"
          disabled={busy || tokensStatus !== "ready" || tokens.length >= 5 || !label.trim()}
          onClick={() => void mint()}
        >
          {busy ? "Working…" : "Create read-only token"}
        </button>
      </div>
      {secret ? (
        <label className="token-once">
          Token — shown once
          <input readOnly value={secret.value} />
          <button type="button" className="btn" onClick={() => void copy(secret.value, "Token copied.")}>
            Copy token
          </button>
        </label>
      ) : null}
      {tokensStatus === "loading" ? (
        <p className="form-note" role="status" aria-live="polite">Loading tokens…</p>
      ) : tokensStatus === "error" ? (
        <p className="form-error" role="status">Tokens unavailable. Refresh before creating one.</p>
      ) : tokens.length ? (
        <ul className="token-list">
          {tokens.map((item) => (
            <li key={item.id}>
              <div className="token-identity">
                <strong>{item.label}</strong>
                <span><code>{item.prefix}…</code> · {item.scope}</span>
              </div>
              <div className="token-status">
                <span>{item.lastCheckedAt ? `Checked ${formatTokenMoment(item.lastCheckedAt)}` : "Not checked yet"}</span>
                <span>
                  {item.lastReturnedBoardId
                    ? `Last board returned ${item.lastReturnedBoardId}`
                    : "No board returned yet"}
                </span>
                <span>Expires {formatTokenDate(item.expiresAt)}</span>
              </div>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void revoke(item.id)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="form-note">No tokens. New tokens are shown once and expire after 90 days.</p>
      )}

      <section className="digest-connect">
        <p className="digest-connect-kicker">Endpoint</p>
        <label className="digest-url">
          Latest complete board
          <input readOnly value={digestUrl} />
          <span className="form-note">
            Use <code>YYYY-MM-DD</code> instead of <code>latest</code> for a fixed board.
          </span>
        </label>
        <div className="digest-actions">
          <button type="button" className="btn" onClick={() => void copy(digestUrl, "URL copied.")}>
            Copy URL
          </button>
          <button type="button" className="btn" onClick={() => void copy(routingPrompt, "Routing instructions copied.")}>
            Copy routing instructions
          </button>
        </div>
        <details className="routing-manual">
          <summary>Manual setup</summary>
          <pre className="routing-code"><code>{curlExample}</code></pre>
          <a href={schemaUrl} target="_blank" rel="noreferrer">Open JSON schema ↗</a>
        </details>
      </section>
    </section>
  );
}

function formatTokenMoment(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PublicProfilePage() {
  const { name = "" } = useParams();
  const { account } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!name) return;
    let ignore = false;
    getPublicProfile(name)
      .then((data) => {
        if (ignore) return;
        setProfile(data.user);
        setMissing(false);
      })
      .catch(() => {
        if (ignore) return;
        setProfile(null);
        setMissing(true);
      });
    return () => {
      ignore = true;
    };
  }, [name]);

  if (missing) {
    return (
      <AuthCard kicker="Profile" title="Profile not found">{null}</AuthCard>
    );
  }

  if (!profile) {
    return (
      <AuthCard kicker="Profile" title="Loading profile…">{null}</AuthCard>
    );
  }

  const joined = formatJoined(profile.joinedAt);
  const mine = account?.id === profile.id;
  const empty = !profile.bio && !profile.x && !profile.linkedin;

  return (
    <AuthCard
      wide
      kicker="Profile"
      title={profile.name}
      aside={joined ? `Joined ${joined}` : undefined}
    >
      {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
      {profile.x || profile.linkedin ? (
        <p className="profile-links">
          {profile.x ? (
            <a href={profile.x} target="_blank" rel="noreferrer">
              <IconX />
              <span>X</span>
            </a>
          ) : null}
          {profile.linkedin ? (
            <a href={profile.linkedin} target="_blank" rel="noreferrer">
              <IconLinkedIn />
              <span>LinkedIn</span>
            </a>
          ) : null}
        </p>
      ) : null}
      {empty ? (
        <p className="lede">
          {mine ? "Add a bio on your account page." : "No bio or links yet."}
        </p>
      ) : null}
      {mine ? (
        <p className="profile-nav">
          <Link to="/account">Edit profile</Link>
        </p>
      ) : null}
    </AuthCard>
  );
}

function formatJoined(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function SavedPage() {
  const { account, ready, saves } = useSession();
  const saved = catalog.flatMap((edition) =>
    edition.papers
      .filter((paper) => saves.includes(paper.id) || saves.includes(paper.arxivId))
      .map((paper) => ({ paper, edition })),
  );

  if (!ready) {
    return <AuthCard kicker="Saved" title="Checking your session…">{null}</AuthCard>;
  }

  if (!account) {
    return (
      <AuthCard kicker="Saved" title="Saved papers">
        <p className="lede">Sign in to save papers.</p>
        <p className="sheet-mark">
          <Link className="btn primary" to="/login">Sign in</Link>
          <Link className="btn" to="/">Back to the board</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <div className="subpage">
      <article className="sheet">
        <header className="sheet-head">
          <p className="sheet-kicker">Saved</p>
          <h1>{saved.length ? "Your shelf" : "Nothing saved"}</h1>
        </header>
        {saved.length === 0 ? (
          <p className="lede">Save a paper from the board.</p>
        ) : (
          <ul className="later-list">
            {saved.map(({ paper, edition }) => (
              <li key={paper.id}>
                <Link to={`/p/${paper.id}`}>{paper.title}</Link>
                <div className="saved-meta">
                  <span>{edition.label}</span>
                  <span aria-hidden="true">·</span>
                  <AuthorList authors={paper.authors} visible={2} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function formatTokenDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AuthCard({
  kicker,
  title,
  aside,
  wide,
  children,
}: {
  kicker?: string;
  title: string;
  aside?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "subpage auth-page roomy" : "subpage auth-page"}>
      <article className="sheet auth-sheet">
        <header className="sheet-head">
          {kicker ? <p className="sheet-kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {aside ? <p className="sheet-lead">{aside}</p> : null}
        </header>
        {children}
      </article>
    </div>
  );
}
