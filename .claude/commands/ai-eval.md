---
description: Run AI feature evals against the fixture inbox and report quality
argument-hint: [summarize|draft|prioritize|all]
---

Run AI evals against the fixture inbox in `src/lib/providers/fixtures.ts`.

**Target**: $ARGUMENTS (default: `all`)

Process:

1. Start the dev server with `DEMO_MODE=1 npm run dev` in the background.
2. For each fixture thread (8 threads), call the relevant AI route:
   - `summarize` → `POST /api/ai/summarize { threadId, accountId }`
   - `draft` → `POST /api/ai/draft { threadId, accountId, tone }` for each of `concise | friendly | formal`
   - `prioritize` → `POST /api/ai/prioritize { label: 'INBOX' }` (single call, all threads)
3. Print a markdown report to stdout with one section per feature:
   - **summarize**: thread subject → oneLine, bullets count, actionItems count. Flag any thread where `oneLine` doesn't mention a noun from the subject.
   - **draft**: thread subject + tone → first 80 chars of bodyText. Flag any draft containing "I hope this finds you well", "Best regards", or "[Name]".
   - **prioritize**: full bucket distribution. Assert: ACME renewal = urgent, AWS billing = urgent, Pragmatic Engineer = low, recruiter bot = low.
4. Tear down the dev server.

Use the **ai-features-engineer** agent. Requires `ANTHROPIC_API_KEY` in `.env`.
