# Spec 001 — Unified inbox

## Goal

A single list view that surfaces every thread across every connected account, sorted by recency by default and by AI priority when available.

## User stories

- As a user with 3 accounts, when I open the app, I see all 3 inboxes merged into one list, with a colored dot on each row indicating which account it came from.
- As a user, I can flip to a single-account view via the account switcher.
- As a user, when AI priorities are available, urgent threads float to the top of the list.

## Out of scope

- Folder/label browsing beyond INBOX/STARRED/SENT/ARCHIVE/TRASH
- Bulk select / multi-thread actions

## Acceptance criteria

1. With 0 accounts connected, the empty state offers Gmail/O365/IMAP connect buttons.
2. With ≥1 account, `/api/mail/list` fans out to each provider in parallel and merges results sorted by `date desc`.
3. The "All inboxes" view shows a per-account colored dot on each row.
4. Switching to a single account filters the list client-side AND sends `?accountId=` to the API (to avoid loading other providers).
5. The list re-renders within 200ms of switching label/account in the local cache.
6. When `DEMO_MODE=1`, the inbox shows the 8 fixture threads from `lib/providers/fixtures.ts`.

## Tests

- Vitest: `tests/unit/providers/demo.test.ts` (sort order, search, archive)
- Playwright: `tests/e2e/inbox.spec.ts` (renders, search narrows, archive removes)
