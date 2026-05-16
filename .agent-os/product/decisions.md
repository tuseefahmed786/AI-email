# Architectural decisions

This is the log. Each entry: date, decision, why, what it rules out.

## 2026-05-14 — Single `MailProvider` interface, no per-provider UI branches

**Why**: We support 3 providers today and want to add more (Fastmail JMAP, ProtonMail bridge) without rewriting the UI each time.

**Rules out**: Provider-specific React components, "if provider === 'gmail'" branches in the page tree, custom thread shapes per provider.

**Cost**: Some Gmail/Graph-specific features (e.g. Gmail conversation tokens, Graph categories) get flattened to a lowest-common-denominator label list. We accept that tradeoff.

## 2026-05-14 — All AI calls server-side, never client-side

**Why**: `ANTHROPIC_API_KEY` is a privileged secret. Per-user costs need to be metered and capped. Client-side prompts would also let users see/edit the prompt, leaking our instruction tuning.

**Rules out**: Direct calls to `api.anthropic.com` from React.

## 2026-05-14 — Shared cached system block across all three AI features

**Why**: Summarize, draft, and prioritize all share the same email-domain context (style rules, privacy posture). Caching that block once cuts per-request input tokens by ~80% for the typical session.

**Rules out**: Different "personality" per feature. If we ever need that, do it via per-feature *user-message* preamble, not by splitting the system block.

## 2026-05-14 — KV (Upstash) for tokens + cache; no relational DB

**Why**: A v0.1 email client doesn't have entities that need joins. Tokens, sessions, summaries, priorities — all are key-lookups. KV is cheaper and Vercel-native.

**Rules out**: User-level analytics, per-user history queries, multi-device sync.

## 2026-05-14 — Demo mode is a first-class runtime path, not just tests

**Why**: This product is judged. Reviewers won't always plumb OAuth on first click. A `DEMO_MODE=1` deploy lets them see the AI features instantly with a curated fixture inbox designed to showcase priority + summary + draft.

**Rules out**: Letting fixture data drift from real provider shapes. Fixtures must match the `MailProvider` contract exactly.

## 2026-05-14 — Opus 4.7 for drafts, Haiku 4.5 for summary/priority

**Why**: Drafts are user-visible and may be sent — bad drafts cost trust. Summary and priority are reference info; haiku gives 10× speed and 5× cost reduction at quality acceptable for both.

**Rules out**: Per-account model choice in v0.1. If a power user wants Opus everywhere, that's a v0.2 setting.

## 2026-05-14 — Plain text compose in v0.1

**Why**: HTML compose adds an editor dependency, sanitization on the *send* path, and an attachments path that's also non-trivial. Plain text covers ~80% of replies and ships in days, not weeks.

**Rules out**: HTML formatting (bold/italic/links) and attachments in v0.1.
