# CLAUDE.md — Universal Mail

This file orients Claude Code agents working in this repo. Read it before editing.

## What this project is

Universal Mail is an **AI-first**, mobile-ready PWA email client. One unified inbox across **Gmail, Office 365, and IMAP** (Yahoo / AOL / iCloud / generic), with Claude-powered **summaries**, **reply drafts**, and **priority sorting**.

We ship **only email** — no contacts, no calendar, no tasks, no notes. Scope is deliberately narrow.

## Stack

- **Next.js 15** (App Router, RSC) + **TypeScript** strict + **Tailwind**
- **Anthropic SDK** (`@anthropic-ai/sdk`) — `claude-opus-4-7` for drafting, `claude-haiku-4-5` for summarization & prioritization
- **Provider adapters**: `googleapis` (Gmail), `@microsoft/microsoft-graph-client` (O365), `imapflow` + `mailparser` + `nodemailer` (IMAP/SMTP)
- **Auth**: JWT session cookie (`jose`), Upstash Redis for token + cache storage with in-memory fallback
- **PWA**: hand-rolled service worker, web app manifest
- **Tests**: Vitest (unit) + Playwright (e2e against `DEMO_MODE=1`)

## Architecture — read this before adding a provider or feature

```
src/
├── types/mail.ts                  ← THE contract every provider implements
├── lib/
│   ├── providers/                 ← MailProvider implementations
│   │   ├── gmail.ts
│   │   ├── microsoft.ts
│   │   ├── imap.ts
│   │   ├── demo.ts                ← fixture provider used in DEMO_MODE + tests
│   │   ├── fixtures.ts            ← realistic demo inbox
│   │   └── registry.ts            ← getProvider() dispatch
│   ├── ai/                        ← Claude features
│   │   ├── client.ts              ← Anthropic client, cached system prompt
│   │   ├── summarize.ts
│   │   ├── draft.ts
│   │   └── prioritize.ts
│   ├── auth/                      ← session + account/token storage
│   └── db/kv.ts                   ← Upstash or in-mem
├── app/
│   ├── api/
│   │   ├── auth/{gmail,microsoft,imap,callback,signout}/
│   │   ├── mail/{list,thread,send,search,action,labels,accounts}/
│   │   └── ai/{summarize,draft,prioritize}/
│   ├── page.tsx                   ← unified inbox (three-pane responsive)
│   └── settings/page.tsx
├── components/                    ← presentational React
└── state/store.ts                 ← Zustand
```

## Hard rules

1. **The MailProvider contract is sacred.** Any new provider implements every method in `src/types/mail.ts`. UI never branches on provider kind — it talks to `MailProvider` only. If a provider can't support an action, throw a typed error; do NOT silently no-op.
2. **AI calls only happen server-side.** No `ANTHROPIC_API_KEY` reaches the client. Every AI call is behind a route in `app/api/ai/`.
3. **Prompt caching is non-negotiable** on the shared system block (see `lib/ai/client.ts`). Don't inline system text into per-request `messages` — it defeats caching.
4. **No invented facts** in AI output. Prompts in `lib/ai/*.ts` already enforce "cite, don't invent." If you change a prompt, preserve that guarantee and add an eval to `tests/unit/ai/`.
5. **Sanitize all received HTML** through `isomorphic-dompurify` before rendering. The `ThreadView` already does this; never bypass.
6. **Mobile-first.** The three-pane layout collapses to one pane on `< md`. Test every UI change at iPhone width.
7. **Demo mode must keep working.** With `DEMO_MODE=1` and no API keys, the UI must render the fixture inbox and exercise every screen except live send. e2e tests depend on this.

## Conventions

- TypeScript strict, no `any`, prefer `unknown` + narrowing
- Tailwind utility classes; named `.card / .btn-* / .chip / .input` patterns in `globals.css`
- Server routes use Zod (`z`) to validate request bodies
- All KV reads/writes go through `lib/db/kv.ts`
- New AI prompts: cache the system block, return JSON only, include a `safeParse` fallback
- Tests live next to source by directory mirror (`src/lib/foo.ts` → `tests/unit/foo.test.ts`)

## Workflow

1. Pick a spec in `.agent-os/specs/` (or write a new one)
2. Drive the implementation with the matching agent (`.claude/agents/`)
3. Pre-commit hook runs `npm run typecheck && npm run test`
4. Before merging anything that touches `lib/ai/`, run the **ai-eval** skill against the fixture inbox to confirm no regressions

## Anti-patterns (don't do)

- Calling Gmail/Graph APIs directly from a React component
- Adding a 4th provider without first extending `MailProvider`
- Adding an AI feature without a server route + a unit test + a fixture
- Disabling DOMPurify "just for this email"
- Using `JSON.parse` on AI output without a fallback
- Caching AI responses in the browser (server-only)
- Embedding secrets in `next.config.js` or any file under `src/`

## Where things live

- **Mission, roadmap, tech stack, decisions**: `.agent-os/product/`
- **Specs**: `.agent-os/specs/NNN-<slug>/spec.md`
- **Agents** (specialized Claude personas): `.claude/agents/`
- **Skills** (reusable workflows): `.claude/skills/`
- **Hooks** (auto-run on tool events): `.claude/hooks/`
- **Slash commands**: `.claude/commands/`
- **Plugin manifest**: `.claude/plugins/universal-mail/`
