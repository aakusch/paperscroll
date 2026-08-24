import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  createToken,
  getPublicProfile,
  listTokens,
  revokeToken,
  type DigestToken,
  type PublicProfile,
  type User,
} from "./api";
import { catalog } from "./data";
import { IconLinkedIn, IconX } from "./icons";
import { passwordStrength } from "./identity";
import { useSession } from "./session-context";
import { useUsernameAvailability } from "./useUsername";

export function AboutPage() {
  return (
    <div className="subpage about-page">
      <article className="sheet about-sheet">
        <header className="sheet-head">
          <p className="sheet-kicker">About</p>
          <h1>Catch up over coffee</h1>
        </header>
        <p className="lede">
          PaperScroll is one shared morning board of research. Finish it over
          coffee and leave knowing what exists, where the claim bends, and what
          deserves a full read.
        </p>

        <section className="block">
          <h2>One shared top ten</h2>
          <p className="brief-p">
            Everyone gets the same papers on the same morning. Signed-in
            readers can put their fields first, but nothing disappears. Saved
            papers are a shelf, not training data for a private feed.
          </p>
        </section>

        <section className="block">
          <h2>How the cut works</h2>
          <p className="brief-p">
            Eligibility is mechanical: a current intake, mapped field, title,
            authors, and abstract. Hugging Face listing, votes, independent
            source count, recency, and arXiv ID form a stable ordering. The
            strongest paper in every represented field is guaranteed a seat; remaining
            seats follow that same ordering. No reader profile changes the ten.
          </p>
        </section>

        <section className="block">
          <h2>What the packet adds</h2>
          <p className="brief-p">
            The abstract is the authors’ context. PaperScroll generates the
            decision layer in one source-grounded batch: Try, Watch, or Skip;
            the claim, visible limit, artifact status, and next action. The
            model has the title and abstract, not the PDF, and the paper page
            says so. If any of the ten packets fails validation, the whole day
            stays unpublished rather than silently shrinking.
          </p>
        </section>

        <section className="block">
          <h2>What “today” means</h2>
          <p className="brief-p">
            Today is the board date, not when every PDF first appeared. Cards
            retain that first-appearance date. The daily pool, deterministic
            cut, packet batch, validation, and publication run as one weekday
            job. Once published, a dated board is frozen.
          </p>
        </section>

        <section className="block">
          <h2>Finish, then choose</h2>
          <p className="brief-p">
            Start routine to read every packet in order. Save what needs a full
            read. Reader discussion stays secondary and is for caveats,
            replications, or useful artifacts—not engagement for its own sake.
          </p>
        </section>

        <section className="block">
          <h2>Optional agent handoff</h2>
          <p className="brief-p">
            A signed-in reader can mint a token for <code>/api/digest</code>.
            It returns the same full board reordered by the account’s fields,
            with board packets and links but never raw abstracts. An agent may map
            those packets onto a workspace; it must not invent missing methods,
            numbers, or repositories. The handoff is optional. The packet is
            still the product.
          </p>
        </section>

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
      kicker="Welcome"
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (account) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      kicker="Account"
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

  if (!ready) {
    return (
      <AuthCard kicker="Account" title="Loading your account…">
        <p className="form-note">Checking your session.</p>
      </AuthCard>
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
      wide
      kicker="Account"
      title={account.name}
      aside={joined ? `Joined ${joined}` : undefined}
    >
      <nav className="profile-nav">
        <Link to={`/u/${account.name}`}>Public profile</Link>
        <Link to="/welcome">Change fields</Link>
      </nav>

      <div className="account-composition">
        <strong>Morning composition</strong>
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
          <span className="form-note">Used to sign in. Not shown on your public profile.</span>
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
            placeholder="What you’re working on, or how you read the board."
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

      <AgentDigest />

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

function AgentDigest() {
  const { toast } = useSession();
  const [tokens, setTokens] = useState<DigestToken[]>([]);
  const [secret, setSecret] = useState<{ id: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void listTokens()
      .then((data) => {
        if (live) setTokens(data.tokens);
      })
      .catch(() => {
        if (live) toast("Could not load digest tokens.");
      });
    return () => {
      live = false;
    };
  }, [toast]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const digestUrl = `${origin}/api/digest`;

  async function mint() {
    setBusy(true);
    try {
      const created = await createToken();
      setSecret({ id: created.id, value: created.token });
      setTokens((prev) => [
        {
          id: created.id,
          prefix: created.prefix,
          createdAt: created.createdAt,
          lastUsedAt: null,
          expiresAt: created.expiresAt,
        },
        ...prev,
      ]);
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
      <h2>Agent digest</h2>
      <p>
        Optional handoff for the same morning you just read. An agent sends a
        bearer token to this endpoint; your saved fields reorder the full shared
        board and your desk supplies workspace context. The payload contains
        board packets, never raw abstracts.
      </p>
      <label className="digest-url">
        Endpoint
        <input readOnly value={digestUrl} />
        <span className="form-note">
          Optional: <code>date=YYYY-MM-DD</code> and <code>format=json</code>
        </span>
      </label>
      <div className="digest-actions">
        <button type="button" className="btn" onClick={() => void copy(digestUrl, "URL copied.")}>
          Copy URL
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || tokens.length >= 5}
          onClick={() => void mint()}
        >
          {busy ? "Working…" : "Create token"}
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
      {tokens.length ? (
        <ul className="token-list">
          {tokens.map((item) => (
            <li key={item.id}>
              <code>{item.prefix}…</code>
              <span>
                {formatJoined(item.createdAt)}
                {item.lastUsedAt ? ` · used ${formatJoined(item.lastUsedAt)}` : " · unused"}
                {item.expiresAt ? ` · expires ${formatTokenDate(item.expiresAt)}` : ""}
              </span>
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
        <p className="form-note">No digest tokens yet.</p>
      )}
    </section>
  );
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
      <AuthCard kicker="Profile" title="No profile">
        <p className="lede">That account isn’t here.</p>
      </AuthCard>
    );
  }

  if (!profile) {
    return (
      <AuthCard kicker="Profile" title="Profile">
        <p className="lede">Loading…</p>
      </AuthCard>
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
    return <AuthCard kicker="Saved" title="Loading your shelf…"><p className="form-note">Checking your session.</p></AuthCard>;
  }

  if (!account) {
    return (
      <AuthCard kicker="Saved" title="Your shelf lives on your account">
        <p className="lede">Sign in to save papers without changing the shared board.</p>
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
          <p className="lede">
            Save a paper from the board and it lands here. This shelf is yours;
            it does not change today’s ten.
          </p>
        ) : (
          <ul className="later-list">
            {saved.map(({ paper, edition }) => (
              <li key={paper.id}>
                <Link to={`/p/${paper.id}`}>{paper.title}</Link>
                <span>
                  {edition.label} · {paper.authors}
                </span>
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
  kicker: string;
  title: string;
  aside?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "subpage auth-page roomy" : "subpage auth-page"}>
      <article className="sheet auth-sheet">
        <header className="sheet-head">
          <p className="sheet-kicker">{kicker}</p>
          <h1>{title}</h1>
          {aside ? <p className="sheet-lead">{aside}</p> : null}
        </header>
        {children}
      </article>
    </div>
  );
}
