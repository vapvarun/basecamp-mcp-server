# Plan: migrate the API layer to the official `@37signals/basecamp` SDK

**Status:** PROPOSAL (needs approval before any code)  **Date:** 2026-06-02

## Why

The MCP currently hand-rolls every Basecamp HTTP call + OAuth in `src/basecamp-api.ts`
(`BasecampAPI` class). That's the root cause of the class of bug hit on 2026-06-02:
a caller passed `column_id`/`project_id`+`recording_id` instead of the canonical
`to_column`/`url`+`comment`, and the hand-rolled code failed silently ("moved to column
undefined") or cryptically (`url.match` on undefined). Already mitigated with input
validation (commit on `main`) + alias tolerance + a contract test (Phase 1).

The official **`@37signals/basecamp`** TypeScript SDK (github.com/basecamp/basecamp-sdk,
npm `@37signals/basecamp`) gives us, for free:

- **Typed methods** — `client.cards.move(cardId, { columnId })`, `client.comments.create(...)`,
  full `cardTables` / `cards` / `cardColumns` / `cardSteps`. Wrong arg names become
  compile errors, not runtime no-ops.
- **Built-in OAuth 2.0 + token refresh** — `refreshToken`, `isTokenExpired`, and an
  `accessToken: async () => ...` provider. Lets us **retire** `refresh-token.cjs` +
  `sync-token.sh` (we currently hand-roll refresh; our token expires 2026-06-15).
- **Auto-updated endpoint coverage** — 35+ services maintained by 37signals.

## What we KEEP (non-negotiable)

- The MCP tool surface (50+ `basecamp_*` tools) — names + arg schemas unchanged, so
  Claude's usage and `tools.ts` are untouched.
- The index/search layer (`index-manager.ts`, `basecamp_index_search`, `index-cache.json`).
- `basecamp_read`, `basecamp_parse_url`, project caching, the rich text / attachment
  handling in `server.ts`.

Only the **internals** of `basecamp-api.ts` get swapped to delegate to the SDK. Think
of it as replacing the engine, not the dashboard.

## Approach — incremental, behind the existing interface

Keep the `BasecampAPI` class signature; reimplement its methods on top of the SDK so
`server.ts` doesn't change. Migrate in waves, each independently shippable + verifiable:

1. **Spike / scaffolding** — add `@37signals/basecamp` dependency; construct the SDK
   client from existing env (`BASECAMP_ACCESS_TOKEN`, `BASECAMP_ACCOUNT_ID`,
   `BASECAMP_REFRESH_TOKEN`, client id/secret). Wire the async token provider.
   Acceptance: client authenticates; `authorization` round-trips.
2. **Writes first (the part that bit us)** — reimplement `moveCard` → `cards.move`,
   `createComment`/comment-with-file → `comments.create`, `createCard`/`updateCard`.
   Verify against the live Reign board (project 37478494): move a scratch card between
   Bugs (7385503599) and Ready for Testing (7385543856); post + delete a test comment.
   Keep the Phase-1 alias normalization in `server.ts` as the ergonomic layer.
3. **Reads** — `getCard`, `listCards` (preserve the Link-header pagination / `getAll`
   behavior — confirm the SDK paginates or keep our walker), `listColumns`, `getProject`,
   dock, steps. Acceptance: outputs byte-compatible with current tool responses (diff a
   sample of each tool before/after).
4. **OAuth** — switch token refresh to the SDK helpers; retire `refresh-token.cjs` +
   `sync-token.sh` + the cron/automation that calls them. Acceptance: an expired token
   auto-refreshes on a live call.
5. **Cleanup** — delete dead hand-rolled HTTP/OAuth code from `basecamp-api.ts`; keep only
   thin adapters. Update README + CONTRIBUTING.

## Risks & mitigations

- **Response-shape drift** (SDK returns typed objects vs our raw JSON) → the tool layer
  formats responses; add a shape-diff check per tool in Phase 3 before deleting old code.
- **Pagination semantics** (our `getAll` walks Link headers to 3000 rows) → verify the
  SDK's pagination or retain `getAll` over the SDK's request primitive.
- **Index layer coupling** — `index-manager.ts` may call `BasecampAPI` internals; audit
  its call sites first (Phase 1) and keep those methods stable.
- **Auth regressions** — do OAuth (Phase 4) last, after reads/writes are proven, so a
  token issue can't mask a migration bug.
- **Rollback** — each wave is a separate commit; `BasecampAPI` keeps the same public
  methods, so reverting a wave is a single `git revert`.

## Testing

- Extend `test/contract.test.mjs` with the other write tools' required-arg locks.
- Add a thin integration smoke (guarded by an env flag + a scratch column) that does
  move → comment → read → move-back against the live board, run manually before release.
- `npm run build` clean + `npm test` green at every wave.

## Effort / recommendation

Roughly: Phase 1 spike (S), writes (M), reads (M), OAuth (S), cleanup (S). It's an
**investment, not a bug fix** — correctness is already restored. Worth doing **if** we
keep extending this MCP (typed params + free token refresh are the durable wins). If the
MCP is in maintenance-only mode, the Phase 0/1 hardening already shipped is sufficient and
this can wait.

**Decision needed:** green-light Phase 1 spike, or shelve and revisit at the next
token-expiry / feature push.
