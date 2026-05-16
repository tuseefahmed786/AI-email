# Spec 003 — AI reply drafts

## Goal

A one-tap "draft a reply" affordance on every thread, with selectable tone (concise / friendly / formal) and an optional free-text instruction ("decline politely; suggest Tuesday").

## Why this matters

The hardest part of email isn't deciding what to say — it's writing the first sentence. We aim to make the first draft good enough that the user edits, not writes from scratch.

## Design

- Server route: `POST /api/ai/draft` with `{ threadId, accountId, tone, instruction? }`
- Uses **`claude-opus-4-7`** — drafts are user-visible and may be sent; quality matters more than cost
- Returns `{ bodyText, rationale }`. Rationale is a one-line "why I wrote it this way" for trust calibration.
- "Use this draft" button calls `openCompose({ thread })` and prefills the textarea via a window global (yes, a hack — refactor in v0.2 to use store state)

## Prompt invariants

- No greetings ("I hope this finds you well") and no closings ("Best regards, [Name]") — the user's mail client will append the signature
- Address every concrete question/request in the last message
- Match the relationship (warm to mom, professional to vendor)
- Length scales with tone (concise: 1–3 sentences, formal: 3–6)

## Acceptance criteria

1. Three tone buttons render; clicking one generates a draft in <4s.
2. The draft is plain text, no signature, no salutation/sign-off.
3. "Regenerate" button calls the API again (no cache for drafts).
4. The free-text instruction box is preserved across regenerations.
5. "Use this draft" opens compose with `Re: <subject>` and the body prefilled.

## Tests

- Manual eval: each fixture thread + each tone → eyeball quality
- Unit: draft API route accepts/rejects malformed input via Zod
