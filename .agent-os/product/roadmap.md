# Roadmap

## v0.1 — Shipped in this assignment

- [x] Unified inbox UI (three-pane responsive, mobile-first)
- [x] MailProvider interface + Gmail / Microsoft Graph / IMAP adapters
- [x] Compose, reply, forward (plain text)
- [x] Archive / delete / star / mark read / labels
- [x] Cross-account search
- [x] AI thread summarization (`claude-haiku-4-5`)
- [x] AI reply drafts in 3 tones (`claude-opus-4-7`)
- [x] AI priority bucketing (`claude-haiku-4-5`)
- [x] PWA: manifest, service worker, offline cached reads
- [x] Demo mode (fixture inbox, no auth required)
- [x] Vitest unit suite + Playwright e2e
- [x] Vercel-ready deploy

## v0.2 — Next

- [ ] HTML compose (rich text editor)
- [ ] Attachments (read + send)
- [ ] Background prioritization via a Vercel cron
- [ ] Per-account signature
- [ ] Push notifications (Web Push)
- [ ] Snooze + "remind me if no reply"

## v0.3 — Bigger swings

- [ ] AI agent mode: "find every customer who replied to my pricing email and didn't book a call"
- [ ] Semantic search (embed + ANN over per-user mail)
- [ ] Multi-device sync (real DB instead of KV)
- [ ] Rules engine ("auto-archive all GitHub notifications older than 7d")

## Explicitly NOT on the roadmap

- Contacts, calendar, tasks, notes
- Native iOS/Android apps (PWA only)
- Multi-tenant teams / shared inbox
