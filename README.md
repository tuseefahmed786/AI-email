# Universal Mail

> AI-first, mobile-ready PWA email client. One inbox across **Gmail**, **Office 365**, and **IMAP** (Yahoo / AOL / iCloud / generic) — with Claude-powered summaries, reply drafts, and priority sorting.

[![CI](https://github.com/.../actions/workflows/ci.yml/badge.svg)](#) ![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![PWA](https://img.shields.io/badge/PWA-ready-success)

## Why

Most people run their lives in 2–4 inboxes. No mainstream client unifies them *and* uses AI to actually help triage. Universal Mail does both, in a PWA that installs on iOS/Android/desktop with no app store.

## What's in the box

- **Unified inbox** across Gmail, O365, and any IMAP host
- **Claude AI features** — every thread summarized, drafts in 3 tones, inbox priority bucketing
- **Mobile-first PWA** — installable, offline-capable for cached reads
- **Demo mode** — runs without OAuth or API keys, against a curated fixture inbox
- **Multi-agent Claude Code workflow** — agents, skills, hooks, plugin, specs

## Live demo

→ **{{VERCEL_URL}}** _(set by `vercel deploy` — see `SETUP.md`)_

Default deployment runs in `DEMO_MODE=1` if no provider keys are configured, so the AI features are immediately exercisable against a sample inbox.

## Quickstart

```bash
git clone <this-repo>
cd "AI-first universal email"
cp .env.example .env       # fill in ANTHROPIC_API_KEY at minimum
npm install
DEMO_MODE=1 npm run dev    # demo inbox, AI on, no OAuth needed
```

Open <http://localhost:3000>.

To connect real mailboxes:
1. Set `GOOGLE_CLIENT_ID/SECRET` (Google Cloud Console) and visit `/api/auth/gmail`
2. Set `MICROSOFT_CLIENT_ID/SECRET` (Azure App Registration) and visit `/api/auth/microsoft`
3. Add IMAP accounts via `/settings#imap` (Yahoo/AOL need an app password)

Full setup walkthrough: [`SETUP.md`](./SETUP.md).

## Deliverables for the assignment

| Deliverable | Where |
|---|---|
| Live Vercel URL | `{{VERCEL_URL}}` (set after `vercel deploy`) |
| `CLAUDE.md` | [`./CLAUDE.md`](./CLAUDE.md) |
| Architecture (one page) | [`./ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Agents / skills / hooks / plugins inventory | [`./AGENTS.md`](./AGENTS.md) |
| Workflow writeup | [`./WORKFLOW.md`](./WORKFLOW.md) |
| Tests | [`tests/unit/`](./tests/unit), [`tests/e2e/`](./tests/e2e), CI in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) |
| Specs (Agent OS methodology) | [`.agent-os/specs/`](./.agent-os/specs) |
| Setup steps | [`./SETUP.md`](./SETUP.md) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server (set `DEMO_MODE=1` for instant demo) |
| `npm run build` | Production build |
| `npm run typecheck` | TS strict typecheck |
| `npm run test` | Vitest unit suite |
| `npm run test:e2e` | Playwright e2e (auto-starts dev server) |
| `npm run lint` | ESLint |

## License

MIT
# AI-email
