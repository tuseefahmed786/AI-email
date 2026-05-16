# Architecture — Universal Mail

A one-page tour of the system. For deeper rationale, read [`.agent-os/product/decisions.md`](./.agent-os/product/decisions.md).

## Diagram

```
┌────────────────────────── Browser (PWA) ──────────────────────────┐
│  React 19 + Next.js App Router                                    │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │ Sidebar  │  │ InboxList  │  │ ThreadView │  │ ComposeSheet │   │
│  └────┬─────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘   │
│       └─────── Zustand store (state/store.ts) ────────┘           │
│                          │                                        │
│  Service Worker (sw.js): SWR app shell, network-first /api/mail/* │
└──────────────────────────┼────────────────────────────────────────┘
                           │ fetch
┌──────────────────────────┴───────── Next.js server routes ────────┐
│  /api/auth/{gmail,microsoft,imap,callback,signout}                │
│  /api/mail/{list,thread,send,search,action,labels,accounts}       │
│  /api/ai/{summarize,draft,prioritize}                             │
│        │                          │                               │
│        ▼                          ▼                               │
│  ┌──────────────┐        ┌─────────────────────────┐              │
│  │ Provider     │        │  AI layer (lib/ai)      │              │
│  │ Registry     │        │  shared cached system   │              │
│  └──┬───────────┘        │  + summarize/draft/prio │              │
│     │                    └────────────┬────────────┘              │
│  ┌──┴──────────────────┐               │                          │
│  │ MailProvider impls   │              ▼                          │
│  │ • GmailProvider      │   Anthropic SDK (server)                │
│  │ • MicrosoftProvider  │   claude-opus-4-7 (drafts)              │
│  │ • ImapProvider       │   claude-haiku-4-5 (sum/prio)           │
│  │ • DemoProvider       │                                         │
│  └──┬───────────────────┘                                         │
│     │                                                             │
│  ┌──┴──────────────────────┐    ┌─────────────────────┐           │
│  │ Auth + token store      │◄──►│ KV (Upstash Redis)  │           │
│  │ (jose JWT cookie)       │    │ in-mem fallback dev │           │
│  └─────────────────────────┘    └─────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
                ▲                                  ▲
       Gmail API / Microsoft Graph / IMAP+SMTP    Anthropic API
```

## The contract that holds it all together

`src/types/mail.ts` defines `MailProvider`. Everything above the providers — the API routes, the UI, the AI features — depends only on this contract. Adding a 4th provider (Fastmail JMAP, ProtonMail bridge, Hey.com IMAP) means writing a new adapter and zero UI changes.

```ts
interface MailProvider {
  kind: 'gmail' | 'microsoft' | 'imap';
  account: MailAccount;
  listThreads(opts): Promise<ListResult>;
  getThread(id): Promise<MailThread>;
  search(q, opts?): Promise<ListResult>;
  listLabels(): Promise<MailLabel[]>;
  send(msg): Promise<{ id, threadId }>;
  applyAction(action): Promise<void>;
}
```

## Request lifecycle: opening a thread

1. User taps a row in `<InboxList>`. Zustand sets `selectedThreadId`.
2. `<ThreadView>` fetches `/api/mail/thread/[id]?accountId=...`.
3. Server resolves the active providers, finds the matching one, calls `getThread`.
4. UI renders messages; `<AISummaryCard>` fires `/api/ai/summarize` in parallel.
5. Server route checks KV cache by `(threadId, messageCount, lastDate)`. Miss → call Claude Haiku with the cached system block + per-thread user message → JSON parse → store in KV → return.
6. `<AIReplyDrafts>` lazily generates a draft when the user picks a tone, hitting `/api/ai/draft` (Opus, no cache).

## Request lifecycle: unified inbox refresh

1. `/api/mail/list?label=INBOX` (no `accountId`) fans out to **all** connected providers in parallel via `Promise.allSettled`.
2. Failures from any one provider don't poison the response — they're returned in a separate `errors` field.
3. Threads are merged, sorted by date, capped at the limit, and returned.
4. The client kicks off `/api/ai/prioritize` in the background with the visible thread IDs. Priorities arrive ~1–2s later and the list re-sorts urgent → important → normal → low.

## Security boundaries

- **Tokens** never leave the server. JWT session cookie holds only `{ userId, accountIds, activeAccountId }`. Provider tokens live in KV under `tokens:<accountId>`.
- **Anthropic API key** never reaches the client. All AI calls go through `/api/ai/*`.
- **HTML rendering** of received messages goes through `isomorphic-dompurify` with `script` and `style` forbidden, plus `onclick/onerror/onload` attributes stripped.
- **CSRF**: v0.1 relies on the `SameSite=Lax` cookie. State param on OAuth is a tracked v0.2 add (see `decisions.md`).
- **Rate limiting**: not implemented in v0.1 — punts to Vercel's edge defaults. Add Upstash Ratelimit before opening to public.

## Demo mode

`DEMO_MODE=1` swaps the entire provider layer for `DemoProvider`, which serves the 8 fixture threads in `lib/providers/fixtures.ts`. AI features still call the real Claude API (set `ANTHROPIC_API_KEY`). This is what `vercel deploy` ships by default unless OAuth env vars are configured.

## Performance notes

- **Prompt caching** — the shared `EMAIL_AI_SYSTEM` block is sent with `cache_control: 'ephemeral'`. Across the typical session (open inbox, summarize 3 threads, draft 1 reply, prioritize), the system tokens are billed once instead of 5×.
- **KV cache** — summaries cached by content hash; same thread is never summarized twice unless it grows.
- **Background prioritization** — list renders immediately with date sort; Claude scoring arrives async.
- **Service worker** — cached `/api/mail/list` responses serve instantly while the network call refreshes in the background.

## Deployment

Vercel-native. `vercel.json` sets per-route timeouts (60s for AI, 30s for mail). Region pinned to `iad1`. Upstash Redis optional but recommended for multi-instance prod.
