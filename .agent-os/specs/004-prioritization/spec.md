# Spec 004 — Inbox prioritization

## Goal

When the inbox loads, Claude scores the top 20–30 visible threads into 4 buckets — `urgent`, `important`, `normal`, `low` — and the UI reorders so urgent threads float to the top with a colored badge.

## Why this matters

Reverse-chronological is the wrong default for high-volume inboxes. The thread that matters most is rarely the most recent one — it's the one with a deadline, or the one your boss sent, or the security alert with action required. The user shouldn't have to scroll to find it.

## Design

- Server route: `POST /api/ai/prioritize` with `{ threadIds?, label }`
- Server fetches up to 30 threads from each provider, hydrates first-message bodies, then sends a single batched request to **`claude-haiku-4-5`** with structured JSON output
- Result cached by inbox-state hash; cache misses on any thread date change

## Bucket definitions (in the prompt)

- **urgent** — deadline within 24h, security/billing alert with action required, real consequence if ignored
- **important** — real human asking for a real reply, no immediate deadline
- **normal** — informational, user probably wants to read but not act
- **low** — newsletters, marketing, no-reply automation

## UI

- `<PriorityBadge>` (compact) on every inbox row, full chip on selected thread
- `<InboxList>` re-sorts by `bucket > date` when priorities arrive
- Background load — list renders immediately, priorities arrive after

## Acceptance criteria

1. With the demo fixture, "ACME Corp renewal" and "AWS billing alert" classify as `urgent` (deadline + budget exceeded).
2. "The Pragmatic Engineer #182" classifies as `low` (newsletter).
3. The list re-sorts within 300ms of `/api/ai/prioritize` returning.
4. If the API fails, the list still renders (just date-sorted, no badges).
5. Priorities are cached and survive a label switch + return.

## Tests

- Manual eval: run `/ai-eval prioritize` and assert bucket assignments on fixtures
