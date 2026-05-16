---
description: Scaffold a new email provider adapter, OAuth (or IMAP) plumbing, registry wiring, and tests
argument-hint: <provider-name>
---

You are scaffolding a new email provider for Universal Mail.

**Provider name**: $ARGUMENTS

Walk through the **new-mail-provider skill** in order. Don't skip steps.

1. Confirm the provider can satisfy every method in `src/types/mail.ts`. If not, stop and open `.agent-os/product/decisions.md` for the user.
2. Create the OAuth route OR the credentials route under `src/app/api/auth/<provider>/`.
3. Create the callback (OAuth only) under `src/app/api/auth/callback/<provider>/route.ts`.
4. Create `src/lib/providers/<provider>.ts` implementing `MailProvider` end-to-end.
5. Wire it into `src/lib/providers/registry.ts` and add the kind to `ProviderKind` in `src/types/mail.ts`.
6. Add fixtures to `src/lib/providers/fixtures.ts` if it should appear in `DEMO_MODE`.
7. Add unit tests under `tests/unit/providers/<provider>.test.ts`.
8. Update `tech-stack.md`, `SETUP.md`, and `.env.example` with any new env vars.
9. Run `npm run typecheck && npm run test`. They must pass before reporting done.

Use the **mail-provider-engineer** agent for the implementation. Use the **test-engineer** agent for step 7.
