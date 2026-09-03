# PaperScroll conventions

Read `README.md` first — it holds the product contract. This file records the
traps a change is likely to hit.

## The board packet carries no verdict

Boards cut on or after 2026-08-26 lead with `reported` (what the authors claim)
and `metrics` (their own figures). There is no Try / Watch / Skip: the board is
one shared cut with no knowledge of the reader's desk, and automatic packets are
built from a title and an abstract, so a recommendation is not something this
product can support. Do not reintroduce one, and do not let a packet field tell
the reader whether to read a paper.

**Every number in `metrics` must appear verbatim in that paper's title or
abstract.** `scripts/publish.mjs` rejects the packet and
`scripts/validate-board.mjs` rejects the board otherwise. If a morning fails this
check, the fix is the prompt or the model — never the assertion.

## Published days are immutable

`src/boards/*.json` is frozen once committed. Boards from 2026-08-21, -24, -25
and the legacy slate in `src/data.ts` still carry verdicts, so both shapes must
render forever. Read the lead line through `packetLead()` in `src/lead.ts`; never
branch on `paper.verdict` directly in a component, and never rewrite an old
board to the current shape.

`scripts/publish.mjs` exits without reranking when a date already exists.
`--repair` is the deliberate operator path, not a retry.

## Generation is atomic

A day appears only when all ten packets validate. There is no partial board and
no abstract-only fallback. Chunked generation validates each chunk before it is
kept, so a failure writes nothing.

## Model endpoints

`PAPERSCROLL_API_BASE` selects the transport: `api.openai.com` uses the OpenAI
Responses API, anything else uses OpenAI-compatible `/chat/completions`. For a
small self-hosted model use `PAPERSCROLL_BATCH_SIZE=1` (one packet per request —
a batch of ten fails strict schema validation), set `PAPERSCROLL_CONCURRENCY` no
higher than the server's slot count, and leave reasoning off. A scale-to-zero
host answers `503 Loading model` for minutes; `fetchWhenReady` waits it out
rather than spending a packet's retries.

## Contracts that reach outside the repo

Changing packet shape means changing all four together, or agents break:

- `src/brief.ts` and `src/agentDigest.ts` — payload and `schemaVersion`
- `public/schemas/digest-v1.json` — the published JSON Schema
- `docs/agent-routing.md` — the documented sample
- `examples/poll-digest.mjs` — the reference client, which pins the version

`scripts/validate-digest.mjs` must assert against the board's own declared
`packetBasis`, not a hardcoded one — pinning it to a repaired board's value
breaks every normal morning after it.

## Briefing Studio prototype

`/briefing-studio` is the settled UI direction for a future configurable agent
endpoint. Keep it as one settings-card flow: fields, a 1–50 paper limit, and a
verbatim instruction for the consuming agent. All six packet sections remain
included. Do not add watch/mute terms, ranking modes, delivery format, or a
ready-by time. Saving moves to endpoint management, and the UI communicates one
endpoint per account. Persistence, billing, and fulfillment are intentionally
not wired yet.

The prototype must not imply per-user model inference. PaperScroll analyzes the
shared research once; the endpoint only composes cached packets for the agent.

## Checks before a board is pushed

```bash
npm run validate-board -- YYYY-MM-DD
npm run validate-digest && npm run validate-routing && npm run validate-store
npm run lint && npm run build
```

The scheduled job in `.github/workflows/morning-pool.yml` runs the same set and
refuses to publish if `main` advanced during generation. It needs an
`OPENAI_API_KEY` repository secret, or a base URL and key for another endpoint.
