# Spec 002 — AI thread summaries

## Goal

Every time the user opens a thread, show a one-line summary, 2–4 fact bullets, and 0–3 action items the *user* must do, before they read the actual messages.

## Why this matters

The dominant cost in email isn't reading — it's deciding "do I have to do something here?". A summary with explicit "you need to" items collapses that decision to <2 seconds.

## Design

- Server route: `POST /api/ai/summarize` with `{ threadId, accountId }`
- Server fetches the thread via `MailProvider.getThread`, calls `summarizeThread()`
- `summarizeThread` uses **`claude-haiku-4-5`** with a cached system block + JSON-only output instruction
- Result cached in KV by `(threadId, messageCount, lastMessageDate)` — the same thread is never summarized twice unless it grows
- UI: `<AISummaryCard>` renders on top of every `<ThreadView>`, with a skeleton state while loading

## Prompt invariants (don't break)

- Never invent facts
- Treat newsletters and automated alerts as low-signal
- JSON only, no prose around it
- Action items are imperative voice, addressed to the user

## Acceptance criteria

1. Opening a thread fires exactly one `/api/ai/summarize` call.
2. Re-opening the same thread within a session hits the cache (no second LLM call).
3. The summary card renders with skeleton in <100ms and full text in <2s on Haiku.
4. If the API fails, the card shows a graceful error, not a crash.
5. The "You need to" section is hidden when `actionItems` is empty.

## Tests

- Unit: fixture thread → summary parse round-trip
- Manual eval: run `/ai-eval summarize` against all 8 fixture threads, eyeball quality
