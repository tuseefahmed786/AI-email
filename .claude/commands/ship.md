---
description: Pre-ship checklist — typecheck, tests, build, security review, then deploy preview
---

Run the full pre-ship sequence. Stop on the first failure and report.

1. `npm run typecheck`
2. `npm run test`
3. `npm run build` (catches Next.js build-time issues)
4. `npm run test:e2e` (against `DEMO_MODE=1`)
5. Spawn the **security-reviewer** agent on the working tree
6. If everything passes: print the `vercel deploy` command for the user to run, with the env-var checklist from `.env.example`

Don't actually deploy — that requires the user's Vercel auth.
