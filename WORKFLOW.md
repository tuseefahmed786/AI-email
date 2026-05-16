# Workflow — How this project was built with Claude Code

A short writeup of the process so anyone can reproduce it.

## Methodology: Agent OS + specs-driven

We use the **Agent OS methodology**: every feature starts as a spec under `.agent-os/specs/`, the spec drives the implementation, and the spec doubles as the test plan.

Three things make this work:

1. **`CLAUDE.md` is loaded into every Claude Code session** and contains the contract every agent must respect: the `MailProvider` interface, the AI-call invariants, the security rules. New agents can't drift from these without consciously editing them.
2. **`.agent-os/product/`** contains stable, slow-changing project knowledge: mission, roadmap, tech stack, decisions log. Decisions are append-only — when we change direction, we add a dated entry rather than rewriting history.
3. **`.agent-os/specs/`** contains per-feature specs. Each spec has: goal, user stories, design, acceptance criteria, tests. The spec is the single source of truth — when behavior diverges, the spec or the code changes, never both silently.

## Multi-agent split

The five subagents (see `AGENTS.md`) carve the codebase along **change-frequency lines**, not file types:

- **`mail-provider-engineer`** owns the spine — the contract changes rarely; when it does, it ripples everywhere
- **`ai-features-engineer`** owns the prompts — they iterate weekly; getting them wrong has the highest user cost
- **`pwa-ui-engineer`** owns the surface — frequent small changes, low blast radius
- **`test-engineer`** owns coverage — invoked at the end of every feature
- **`security-reviewer`** owns the audit — invoked before merge, never writes code

This split means:
- The PWA engineer never edits a prompt by mistake
- The AI engineer never bypasses sanitization
- The security reviewer doesn't get pulled into implementation

## Specs-driven loop

```
1. Open or write spec  →  .agent-os/specs/NNN-<slug>/spec.md
2. Pick the right agent (Mail / AI / PWA)
3. Implement
4. Run /ai-eval (if AI) or npm run test (always)
5. Hand off to test-engineer to fill coverage gaps
6. Run /ship for pre-merge gate
```

The slash commands are the muscle-memory:
- `/new-provider <name>` — turns the new-provider skill into a one-line invocation
- `/ai-eval <feature>` — runs the AI eval suite against fixtures
- `/ship` — full pre-merge sequence

## Hooks enforce the discipline

Three hooks make the process self-correcting:

1. **`forbid-secrets-in-source.sh`** (PreToolUse on Write) — hard-blocks any write into `src/` or `public/` containing real-looking secret prefixes. A Claude session that "accidentally" inlines an API key gets stopped before the file lands.
2. **`post-edit-typecheck.sh`** (PostToolUse on Edit/Write) — soft-fail typecheck warning, surfaced to Claude on the next turn. Type errors don't accumulate.
3. **`on-stop-summary.sh`** (Stop) — at the end of every turn, prints a typecheck + test result tail. The user sees the health check without re-running.

Plus a git pre-commit hook blocking commits that fail `typecheck` or `test`.

## How a feature actually got built — concrete example

**Spec 002 — AI thread summaries:**

1. Wrote `.agent-os/specs/002-ai-summaries/spec.md` first — defined the prompt invariants ("never invent facts", "imperative action items"), output shape (JSON), caching key (`threadId+messageCount+lastDate`), and acceptance criteria.
2. Spawned the `ai-features-engineer` agent with the spec.
3. Agent wrote `src/lib/ai/client.ts` (shared cached system block), `src/lib/ai/summarize.ts` (prompt + KV cache), `src/app/api/ai/summarize/route.ts` (Zod-validated route), `src/components/AISummary.tsx` (UI with skeleton state).
4. Hook ran typecheck after each write — caught one `any` that had to be narrowed.
5. Spawned `test-engineer` — added round-trip parse test for `safeParse`, fixture-based smoke test.
6. `/ai-eval summarize` against the 8 fixture threads — manually inspected output, tweaked prompt to fix one weak summary on the AWS billing thread.
7. `security-reviewer` confirmed `ANTHROPIC_API_KEY` doesn't reach the client and the route requires session.

Total: ~30 minutes spec → shipped feature.

## Why this scales

The contract (`MailProvider`), the agent boundaries, and the hooks together mean that a *new* contributor (human or Claude) can only meaningfully edit one slice of the code at a time. The blast radius of a bad change is bounded. Adding a 4th provider is mechanical. Adding a 4th AI feature follows the same recipe as the first three.

The cost of this discipline up front (writing the contract carefully, defining the agents, wiring the hooks) is what lets the next features ship in hours instead of days.
