# Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | Server routes co-located with UI; RSC keeps tokens server-side |
| Language | TypeScript strict | Provider contract is the spine; types are how we enforce it |
| UI | Tailwind + Lucide icons | Mobile-first utilities, no design-system bloat |
| State | Zustand | Light; we don't need Redux |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) | `claude-opus-4-7` for drafting, `claude-haiku-4-5` for fast summary/priority |
| Prompt caching | Anthropic ephemeral cache control | Shared system block reused across summarize/draft/prioritize |
| Gmail | `googleapis` | Official, handles OAuth refresh |
| O365 | `@microsoft/microsoft-graph-client` | Official |
| IMAP | `imapflow` + `mailparser` + `nodemailer` | Reliable, modern API |
| Auth | `jose` JWT cookie + Upstash Redis | No password DB; tokens encrypted at rest in Upstash |
| Storage | Upstash Redis REST (Vercel Marketplace) | Serverless-friendly; in-memory fallback in dev |
| Sanitization | `isomorphic-dompurify` | Sanitize received HTML before rendering |
| Validation | `zod` | Every server route validates its input |
| Tests | Vitest (unit) + Playwright (e2e) | Vitest is fast; Playwright runs in mobile viewport too |
| PWA | Hand-rolled SW + manifest | Avoids dependency lock-in; we know exactly what's cached |
| Deploy | Vercel | Edge + serverless; native Next.js |

## Why these models specifically

- `claude-opus-4-7` for **reply drafting** — drafts are the highest-stakes AI output (the user might actually send them). Pay for the quality.
- `claude-haiku-4-5` for **summarize** and **prioritize** — these run on every thread / inbox load. Latency and cost matter more than peak quality. The system prompt (`EMAIL_AI_SYSTEM`) is shared across all three features so prompt caching amortizes the system tokens.

## Cost guardrails (defaults)

- Summaries are KV-cached by `(threadId, messageCount, lastDate)` — same thread isn't summarized twice
- Priority results are KV-cached by an inbox-state hash — inbox doesn't re-classify on every refresh
- Drafts are NOT cached — every tone change should produce a fresh draft
