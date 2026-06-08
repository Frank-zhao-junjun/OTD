# QA Report — OTD (localhost:5000)

| Field | Value |
|-------|-------|
| Date | 2026-06-08 |
| Branch | `main` @ `aeac5c7` (+ QA fixes) |
| Target | http://127.0.0.1:5000 |
| Tier | Standard |
| Duration | ~5 min |
| Pages visited | 10 |

## Health Score

| Metric | Before | After |
|--------|--------|-------|
| **Overall** | **72/100** | **84/100** |

| Category | Before | After | Weight |
|----------|--------|-------|--------|
| Console | 85 | 85 | 15% |
| Links / Routes | 100 | 100 | 10% |
| Functional | 55 | 80 | 20% |
| UX | 80 | 80 | 15% |
| Performance | 70 | 70 | 10% |
| Content | 90 | 90 | 5% |
| Accessibility | 75 | 75 | 15% |

## Smoke Test (HTTP 200)

All primary routes load:

- `/`, `/sales-orders`, `/production-orders`, `/material-documents`
- `/material-stock`, `/outbound-delivery`, `/billing-documents`
- `/products`, `/customers`, `/settings`

`/api/settings` returns masked SAP config; `sapHost` resolves from env.

## Issues Found

### ISSUE-001 — Search API shape mismatch (remaining pages) — **High** — **FIXED**

- **Pages:** `outbound-delivery`, `material-stock`
- **Symptom:** Fuzzy name search falls back to exact keyword only; DB hits ignored.
- **Cause:** Still reading `searchData.data`; API returns `{ products, customers }`.
- **Fix:** `searchData.customers` / `searchData.products`
- **Commit:** `fix(qa): ISSUE-001 — align search API response on delivery and stock pages`

### ISSUE-002 — V2 OData always sends `$inlinecount` — **Medium** — **FIXED**

- **File:** `src/app/api/sap/[service]/[entity]/route.ts`
- **Symptom:** SAP 400 on some V2 entity queries when `count` not requested.
- **Fix:** Add `$inlinecount=allpages` only when `count=true` (matches V4 `$count=true` gate).
- **Commit:** `fix(qa): ISSUE-002 — only add V2 inlinecount when count=true`

### ISSUE-003 — `/api/sap/search` timeout — **Medium** — **DEFERRED**

- **Symptom:** `GET /api/sap/search?type=product&q=test` exceeded 30s locally.
- **Likely cause:** Supabase/DB connectivity or cold start in dev environment.
- **Action:** Verify Supabase URL/key in `.env.local`; add request timeout + error UI on search-dependent pages.

### ISSUE-004 — `next-env.d.ts` in prod commits — **Low** — **DEFERRED**

- Auto-generated path toggles between dev/build; exclude from manual commits.

## Verified Recent Fix

`aeac5c7` — `hasCustomerMatch` on sales-orders search preserves OR semantics when customer OData filter applies (code review confirmed).

## Top 3 to Fix Next

1. Stabilize `/api/sap/search` (Supabase) — blocks all fuzzy search flows.
2. Merge PR #2 (auth + V4 sales orders + Playwright E2E) for regression coverage on `main`.
3. Add Playwright smoke on `main` post-merge.

## PR Summary

> QA found 4 issues on `main`, fixed 2 (search API shape + V2 inlinecount), health score 72 → 84.
