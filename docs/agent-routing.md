# Route PaperScroll into an agent

PaperScroll exposes a pull endpoint; it does not host or schedule your agent.
Any runtime that can make a scheduled authenticated `GET` can use it.

## Set up a morning route

1. In **Account → Morning route**, create a named `digest:read` token. The
   secret is shown once, stored by PaperScroll only as a hash, expires after 90
   days, and can be revoked without affecting other routes.
2. Store the secret in the agent runtime as `PAPERSCROLL_TOKEN`, not in a
   prompt or repository.
3. Schedule one weekday request after the board's 8:17 a.m.
   `America/New_York` publication job:

   ```http
   GET /api/v1/digest/latest
   Authorization: Bearer ps_live_…
   Accept: application/json
   If-None-Match: "the previous response ETag"
   ```

4. A `304` means this route's composed board is unchanged. On `200`, validate
   `schemaVersion`, require a complete count of ten, and process
   `delivery.key` only if it has not already succeeded.
5. Save the new ETag and `delivery.key` only after the destination write
   succeeds. If the destination supports idempotency keys, pass
   `delivery.key` through.

`latest` means the newest complete board in the frozen registry, not whatever
the wall clock calls today. A specific frozen edition is available at
`/api/v1/digest/YYYY-MM-DD`.

## Delivery semantics

HTTP polling cannot prove exactly-once ingestion in another system. PaperScroll
provides the pieces for safe at-least-once delivery:

- a stable `board.id` for the published morning;
- a `board.version` that changes if a board packet is deliberately repaired;
- a `delivery.key` derived from both, for consumer deduplication; and
- a representation ETag, so an unchanged account composition returns `304`.

The Account page reports when each token last checked and which board was last
returned. “Returned” means PaperScroll sent a `200`; only the receiving runtime
can know whether downstream ingestion completed.

## Payload

The versioned JSON Schema lives at
[`/schemas/digest-v1.json`](https://paperscroll.vercel.app/schemas/digest-v1.json).
The response contains the full shared membership, account-owned field order,
desk context, safe links, and structured host packets:

```json
{
  "schema": "paperscroll.digest",
  "schemaVersion": "1.1",
  "board": {
    "id": "2026-08-24",
    "version": "sha256-…",
    "complete": true,
    "count": 10,
    "membership": "shared"
  },
  "delivery": {
    "key": "paperscroll:2026-08-24:sha256-…"
  },
  "papers": [
    {
      "title": "…",
      "packet": {
        "verdict": "Try",
        "brief": "…",
        "takeaways": ["…"],
        "actions": ["…"],
        "links": { "paper": "…", "code": null }
      }
    }
  ]
}
```

Raw authors' abstracts are never part of this payload. Read
`board.packetBasis` and each packet's `automation.basis`: unattended packets
declare `title-and-abstract`, while a deliberately repaired complete batch may
declare `full-paper` only after every source was reviewed. Neither is a reason
to invent details absent from the packet.

## Runnable example

[`examples/poll-digest.mjs`](../examples/poll-digest.mjs) is dependency-free. It
keeps an ETag and delivery checkpoint locally and makes the destination-write
boundary explicit:

```bash
PAPERSCROLL_TOKEN=ps_live_... node examples/poll-digest.mjs
```

Run it twice: the first run processes ten packets, while the second exits on
`304`. Replace its console loop with the agent or workspace write you actually
own. Do not put the bearer secret into copied routing instructions.

## Errors

The v1 route returns stable error codes: `invalid_date` (400), `invalid_token`
(401), `insufficient_scope` (403), `board_not_found` (404),
`unsupported_format` (406), `rate_limited` (429), and `digest_unavailable`
(503). The 429 response includes `Retry-After`.
