# PaperScroll

PaperScroll is a shared morning board of research: one deterministic top ten,
no endless feed, and enough judgment to decide what deserves a full read. The tagline is
**Catch up over coffee.**

## The job

In five to ten minutes, a reader should finish the morning routine and know:

- what each paper actually contributes;
- the limit or cost that could make the result irrelevant;
- the artifact or next step worth opening; and
- which papers belong on their saved shelf.

The board packet is the product. It contains the verdict, brief, object / limit /
artifact takeaways, actions, and safe links. Automated packets are constrained
to the supplied title and authors' abstract; they are not represented as a full
PDF read. The raw abstract is supporting context, collapsed by default.
Comments and agent forwarding are secondary.

Everyone sees the same board. Signed-in readers can put their fields first, but
fields never hide papers or create a private slate. "Today" is the day this
board was published; each card separately says when the paper first appeared.

This is not search, a PDF warehouse, a personalized recommendation engine, or an
endless summary feed. Selection is one transparent shared ranking. A day appears
only when all ten packets validate; partial boards fail closed.

## Product cuts

The live product is deliberately narrow:

- The board leads with PaperScroll's decision line, not an abstract preview or fake paper
  thumbnail.
- Routine is the primary completion path: board → board packets → caught up.
- Save means "read later." It never downranks a paper or changes tomorrow.
- Discussion is for a concrete caveat, replication note, or useful artifact and
  stays behind the board packet.
- Agent forwarding is optional. `GET /api/v1/digest/latest` returns the same
  board packets as the site and never includes raw authors' abstracts.

There are no ranking controls. The operational bet is that one reproducible,
cross-field cut is more useful than another personalized feed.

## Architecture

PaperScroll stays one process in development and preview:

```text
Hugging Face Daily Papers + selected arXiv new lists
                    │
                    ▼
          src/pools/YYYY-MM-DD.json       intake evidence + persisted field
                    │
          balanced-source-v1 cut: exactly ten shared IDs
                    │
          one structured, source-grounded packet batch
                    │
          exact-ID + evidence + completeness validation
                    │
                    ▼
          src/boards/YYYY-MM-DD.json      frozen published board
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      React site         GET /api/v1/digest/latest

User store: users, sessions, comments, saves, field picks, digest tokens
```

The boundary is intentional:

| Concern | Source of truth |
| --- | --- |
| Daily nominations and listing evidence | `src/pools/*.json` |
| Deterministic shared ranking | `scripts/rank.mjs` |
| Atomic packet generation and board publication | `scripts/publish.mjs` |
| Frozen automatic boards and static registry | `src/boards/*.json`, `src/boards/generated.ts` |
| Legacy August 20 host packets and order | `src/data.ts`, `src/slates.ts` |
| Complete-packet gate | `src/hostPacket.ts` |
| Accounts and reader-owned state | `server/` store (`data/paperscroll.sqlite` locally; Neon on Vercel) |
| Agent packet formats | `src/brief.ts`, `src/agentDigest.ts` |

Vite mounts the SQLite API from `server/vite-plugin.mjs`, so `npm run dev`
serves both the site and `/api` on port 5173. The standalone `npm run api`
command is useful for identity/API diagnostics, but it cannot assemble a digest
because the catalog is loaded through Vite.

The storage adapter is deliberately small: `server/store.mjs` selects
`server/sqlite-store.mjs` for the one-process local app and
`server/neon-store.mjs` only on Vercel (or when explicitly selected with
`PAPERSCROLL_DATABASE=neon`). Board catalog and packets never move into
the user database. Vercel's filesystem is ephemeral, so production reader state
must not use the local SQLite file.

## Run locally

Requires a current Node release with `node:sqlite` and the engine range required
by Vite.

```bash
npm ci
npm run dev
```

Open <http://localhost:5173>. The database is created at
`data/paperscroll.sqlite` and is ignored by git.

Useful checks:

```bash
npm run lint
npm run build
npm run validate-digest
npm run validate-routing
```

## Deploy

The Vercel project builds the Vite site and serves the existing API through the
dispatcher function in `api/dispatch.mjs`; development remains one Vite process.
Connect a managed Postgres database and expose its `DATABASE_URL` to production,
preview, and development deployments. PaperScroll uses that database only for
accounts and reader-owned state. No catalog or packet is generated at request
time.

For this repository, the Vercel project is linked through `.vercel/` (ignored by
git) and a free Neon resource supplies `DATABASE_URL`. Deploy with:

```bash
vercel deploy --prod
```

After deployment, check sign-up, Account token creation and revocation, and both
digest formats against the production URL. A static-only deployment is not a
complete PaperScroll deployment because those flows would lose state.

## Publish a morning

1. Pull nominations for the board date:

   ```bash
   npm run pool -- YYYY-MM-DD
   ```

   This writes `src/pools/YYYY-MM-DD.json` from Hugging Face Daily Papers and
   selected non-firehose arXiv categories. Duplicate arXiv IDs are merged and
   the arXiv watch field is persisted instead of being overwritten by the
   Hugging Face `cs.LG` placeholder. Daily list items may be at most 14 days old;
   raw arXiv-new items may be at most two days old.

2. Cut and publish the board:

   ```bash
   OPENAI_API_KEY=... npm run publish -- YYYY-MM-DD
   ```

   `balanced-source-v1` orders eligible nominations by HF listing, HF votes,
   independent-source count, publication date, and arXiv ID. The strongest
   nomination from each represented field is guaranteed a seat before remaining
   seats are filled. One structured model request creates all ten packets from
   title and abstract. Exact IDs, packet shape, and verbatim evidence spans are
   validated before anything is written. There is no partial-board fallback.
   A deliberately repaired board may instead use `full-paper` packets after all
   ten sources have been read and the complete batch has been reviewed again;
   that evidence basis is carried through the UI and digest contract.

3. Run `npm run lint` and `npm run build`. A published date is immutable unless
   an operator deliberately invokes the repair path; routine reruns exit without
   reranking history.

`.github/workflows/morning-pool.yml` runs all three stages at 8:17 a.m.
`America/New_York` on weekdays, validates the complete product build, confirms
`main` did not advance during generation, and pushes one non-force commit to
`main`. The schedule requires `OPENAI_API_KEY` as an Actions repository secret.
Vercel then deploys that bot-authored commit through its GitHub
connection.

## Morning routing

A signed-in reader creates a named, read-only bearer token under Account. The
canonical v1 route returns the latest complete board as stable JSON, using that
account's saved fields and desk:

```bash
curl -H "Authorization: Bearer ps_live_..." \
  -H "Accept: application/json" \
  "http://localhost:5173/api/v1/digest/latest"
```

The response supplies a schema version, immutable board version, consumer
`delivery.key`, and ETag. A poller sends `If-None-Match` on later checks and gets
`304` while its composed board is unchanged. Fields reorder the full shared
membership and never hide it. The response contains structured host packets and
links, never raw abstracts. Tokens have the fixed `digest:read` scope, are shown
once, stored only as hashes, expire after 90 days, and can be rotated or revoked
from Account.

The old `/api/digest` route remains available for Markdown and legacy JSON
clients. New integrations should follow [the routing contract](docs/agent-routing.md)
and can start from [`examples/poll-digest.mjs`](examples/poll-digest.mjs).

## Demo

`demo/` is a separate Remotion project for the product film. Its screens should
follow the live UI and product contract; it is not a second product prototype.

```bash
cd demo
npm ci
npx remotion render PaperScrollDemo out/paperscroll-demo.mp4
```
