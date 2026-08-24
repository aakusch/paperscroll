# PaperScroll

PaperScroll is a shared morning board of research: one hosted cut, no endless
feed, and enough judgment to decide what deserves a full read. The tagline is
**Catch up over coffee.**

## The job

In five to ten minutes, a reader should finish the morning routine and know:

- what each paper actually contributes;
- the limit or cost that could make the result irrelevant;
- the artifact or next step worth opening; and
- which papers belong on their saved shelf.

The host packet is the product. It contains the verdict, brief, object / limit /
artifact takeaways, actions, and safe links. The authors' abstract is supporting
context, collapsed by default. Comments and agent forwarding are secondary.

Everyone sees the same board. Signed-in readers can put their fields first, but
fields never hide papers or create a private slate. "Today" is the day this
board was hosted; each card separately says when the paper first appeared.

This is not search, a PDF warehouse, a recommendation engine, or an automated
summary feed. A paper without a complete host packet cannot appear on the board
or in the digest.

## Product cuts

The live product is deliberately narrow:

- The board leads with the host's line, not an abstract preview or fake paper
  thumbnail.
- Routine is the primary completion path: board → hosted packets → caught up.
- Save means "read later." It never downranks a paper or changes tomorrow.
- Discussion is for a concrete caveat, replication note, or useful artifact and
  stays behind the host packet.
- Agent forwarding is optional. `GET /api/digest` returns the same host packets
  as the site and never includes authors' abstracts.

If readers do not return for the host judgment, adding feeds, ranking controls,
or more agent features is not the answer. The operational bet is that a host can
publish a credible short board consistently.

## Architecture

PaperScroll stays one process in development and preview:

```text
Hugging Face Daily Papers + selected arXiv new lists
                    │
                    ▼
          src/pools/YYYY-MM-DD.json       catalog / editorial data in git
                    │
          join only to reviewed host packets in src/data.ts
                    │
                    ▼
       complete packets + explicit host order → shared slate of ≤10
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      React site         GET /api/digest

User store: users, sessions, comments, saves, field picks, digest tokens
```

The boundary is intentional:

| Concern | Source of truth |
| --- | --- |
| Daily nominations and listing evidence | `src/pools/*.json` |
| Reviewed host packets and archive copy | `src/data.ts` |
| Explicit daily order and publication gate | `src/slates.ts`, `src/hostPacket.ts` |
| Pool/packet join and eligibility | `src/hydrate.ts`, `src/board.ts` |
| Accounts and reader-owned state | `server/` store (`data/paperscroll.sqlite` locally; Neon on Vercel) |
| Agent packet formats | `src/brief.ts`, `src/agentDigest.ts` |

Vite mounts the SQLite API from `server/vite-plugin.mjs`, so `npm run dev`
serves both the site and `/api` on port 5173. The standalone `npm run api`
command is useful for identity/API diagnostics, but it cannot assemble a digest
because the catalog is loaded through Vite.

The storage adapter is deliberately small: `server/store.mjs` selects
`server/sqlite-store.mjs` for the one-process local app and
`server/neon-store.mjs` only on Vercel (or when explicitly selected with
`PAPERSCROLL_DATABASE=neon`). Editorial catalog and host packets never move into
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
```

## Deploy

The Vercel project builds the Vite site and serves the existing API through the
dispatcher function in `api/dispatch.mjs`; development remains one Vite process.
Connect a managed Postgres database and expose its `DATABASE_URL` to production,
preview, and development deployments. PaperScroll uses that database only for
accounts and reader-owned state. No catalog or brief is generated at request
time.

For this repository, the Vercel project is linked through `.vercel/` (ignored by
git) and a free Neon resource supplies `DATABASE_URL`. Deploy with:

```bash
vercel deploy --prod
```

After deployment, check sign-up, Account token creation and revocation, and both
digest formats against the production URL. A static-only deployment is not a
complete PaperScroll deployment because those flows would lose state.

## Host a morning

1. Pull nominations for the board date:

   ```bash
   npm run pool -- YYYY-MM-DD
   ```

   This writes `src/pools/YYYY-MM-DD.json` from Hugging Face Daily Papers and
   selected non-firehose arXiv categories. Duplicate arXiv IDs are merged. Daily
   list items may be at most 14 days old; raw arXiv-new items may be at most two
   days old. The script prints a suggested briefing queue, not a published board.

2. For a candidate, produce a draft packet:

   ```bash
   OPENAI_API_KEY=... npm run summarize -- <arxiv-id>
   ```

   The command prints draft JSON. It does not write the catalog and its output is
   never publishable as-is. Read the paper and evidence, correct the draft, make
   the verdict, object, limit, artifact, and actions your own, then add the
   reviewed packet to `src/data.ts`. Never invent a repository URL.

3. Add at most ten reviewed arXiv IDs, in the host's intended order, to
   `src/slates.ts`. This explicit list publishes the morning; popularity and
   source order do not choose it.

4. Run the app. Pool nominations are joined to reviewed packets by arXiv ID.
   Unreviewed nominations remain intake evidence only; they cannot become cards.
   A slate ID with an incomplete packet fails closed.

5. Check the board, every routine step, the caught-up screen, and both Markdown
   and JSON digests before treating the day as hosted.

## Digest

A signed-in reader creates a bearer token under Account. By default the digest
uses that account's saved fields and desk:

```bash
curl -H "Authorization: Bearer ps_live_..." \
  "http://localhost:5173/api/digest"
```

Options are `date=YYYY-MM-DD` and `format=json`. The authenticated account owns
the fields and desk; fields reorder the full board and never hide it. The
response contains host packets, links, and composition metadata. It does not contain abstracts. Tokens are
shown once, stored only as hashes, expire, and can be revoked from Account.

## Demo

`demo/` is a separate Remotion project for the product film. Its screens should
follow the live UI and product contract; it is not a second product prototype.

```bash
cd demo
npm ci
npx remotion render PaperScrollDemo out/paperscroll-demo.mp4
```
