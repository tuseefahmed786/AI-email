---
name: new-mail-provider
description: Use this skill when adding a new email provider (e.g. Fastmail JMAP, ProtonMail bridge, Hey.com IMAP). Walks through the MailProvider contract, OAuth or credential plumbing, registry wiring, fixtures, and tests in the order they need to happen.
---

# Skill: new-mail-provider

End-to-end recipe for adding a provider without breaking the universal interface.

## Step 0 — Confirm the provider can satisfy `MailProvider`

Open `src/types/mail.ts`. Does the provider's API expose enough surface to implement **every** method?

- `listThreads` — fetch by label/folder, sortable by date, paginated
- `getThread` — full message bodies for one conversation
- `search` — server-side query (or client-side fallback over `listThreads`)
- `listLabels` — folders/labels with at least name + system-vs-user kind
- `send` — outbound message, optionally in-reply-to a thread
- `applyAction` — at minimum: archive, delete, markRead/Unread, star/unstar

If any of these is genuinely unsupportable, **stop and update `.agent-os/product/decisions.md`** before writing code.

## Step 1 — Auth route

Under `src/app/api/auth/<provider>/route.ts`:
- Mirror `gmail/route.ts` if OAuth
- Mirror `imap/route.ts` if username/password

Always bootstrap a session before redirecting so the callback can attach the account to a user.

## Step 2 — Callback (OAuth only)

Under `src/app/api/auth/callback/<provider>/route.ts`:
- Exchange code → tokens
- Resolve the user's email + display name (provider's user-info endpoint)
- `saveAccount`, `setTokens`, `attachAccountToUser`, update session
- Redirect to `/`

## Step 3 — Adapter

Create `src/lib/providers/<provider>.ts` implementing `MailProvider`. Cross-reference `gmail.ts` for structure.

Map the provider's native types to `MailMessage` / `MailThread` exactly. Don't add fields.

## Step 4 — Registry

Wire the new kind into `src/lib/providers/registry.ts` and add the `ProviderKind` to `src/types/mail.ts`.

## Step 5 — Fixtures (optional but recommended)

If the demo inbox should include this provider, add a fixture set to `src/lib/providers/fixtures.ts`. Keep the realistic mix: 1 urgent, 1 important, 1 newsletter.

## Step 6 — Tests

- Unit: parsing / mapping (mock the provider client; assert shape)
- E2E: extend `tests/e2e/inbox.spec.ts` to cover the new provider in `DEMO_MODE`

## Step 7 — Docs

- Add the provider to the table in `tech-stack.md`
- Add a roadmap line if it's behind a flag
- Update `SETUP.md` with the new env vars

## Don'ts

- Don't add a `<ProviderName>Inbox.tsx` component. The UI is provider-agnostic.
- Don't fork `getCurrentProviders()`. Add to the switch in `registry.ts`.
- Don't put credentials in the JWT cookie. Always KV.
