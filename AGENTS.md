# Agents, Skills, Hooks, Plugins, and Slash Commands

The complete inventory of Claude Code customizations shipped with this repo.

## Subagents — `.claude/agents/`

Specialized Claude personas that own a slice of the codebase. Each has scoped tools, a model recommendation, and explicit invariants.

| Agent | Model | Owns | Use when |
|---|---|---|---|
| [`mail-provider-engineer`](.claude/agents/mail-provider-engineer.md) | Sonnet | `src/lib/providers/`, `src/types/mail.ts`, OAuth callbacks | Adding a provider, changing the `MailProvider` contract |
| [`ai-features-engineer`](.claude/agents/ai-features-engineer.md) | Opus | `src/lib/ai/`, `src/app/api/ai/`, AI evals | Tuning prompts, switching models, debugging AI output |
| [`pwa-ui-engineer`](.claude/agents/pwa-ui-engineer.md) | Sonnet | `src/components/`, `src/app/page.tsx`, PWA manifest, service worker | UI bugs, layout changes, mobile responsiveness |
| [`test-engineer`](.claude/agents/test-engineer.md) | Sonnet | `tests/`, `.github/workflows/ci.yml` | After any feature change, to add/update coverage |
| [`security-reviewer`](.claude/agents/security-reviewer.md) | Opus | (read-only) | Before merging anything touching auth, AI routes, or HTML rendering |

Each agent file declares hard rules in **"Invariants you protect"** and explicit **"What to NEVER do"** sections — critical for keeping the universal interface universal and the AI surface trustworthy.

## Skills — `.claude/skills/`

Reusable, parameterized workflows.

| Skill | What it does |
|---|---|
| [`email-thread-summarize`](.claude/skills/email-thread-summarize/SKILL.md) | Captures the production summarize prompt shape so evals, fixtures, and screenshots produce comparable output |
| [`reply-draft`](.claude/skills/reply-draft/SKILL.md) | Captures the draft prompt + tone calibration. Includes the hard rules (no greeting, no signature, address every ask) |
| [`priority-score`](.claude/skills/priority-score/SKILL.md) | Captures the prioritize prompt + bucket calibration tells (no-reply, EOD, action required, etc.) |
| [`new-mail-provider`](.claude/skills/new-mail-provider/SKILL.md) | End-to-end recipe for adding a provider: contract check → auth → adapter → registry → fixtures → tests → docs |

## Hooks — `.claude/hooks/`

Shell scripts the harness runs on tool events. Configured in [`.claude/settings.json`](.claude/settings.json).

| Hook | Event | Purpose |
|---|---|---|
| [`post-edit-typecheck.sh`](.claude/hooks/post-edit-typecheck.sh) | `PostToolUse` (Edit\|Write) | Soft-fail typecheck on any edited TS/TSX file; surfaces errors next turn |
| [`forbid-secrets-in-source.sh`](.claude/hooks/forbid-secrets-in-source.sh) | `PreToolUse` (Write) | Hard-blocks writes into `src/` or `public/` containing real secret prefixes (sk-ant-, AIza, ghp_, GOCSPX-) |
| [`on-stop-summary.sh`](.claude/hooks/on-stop-summary.sh) | `Stop` | After every Claude turn, prints typecheck + test result tail |
| [`pre-commit.sh`](.claude/hooks/pre-commit.sh) | git pre-commit | Blocks commits that don't pass `typecheck` and `test` |

## Slash commands — `.claude/commands/`

Custom commands the user types (`/<name>`).

| Command | Args | What it triggers |
|---|---|---|
| [`/new-provider`](.claude/commands/new-provider.md) | `<name>` | Walks the **new-mail-provider** skill end-to-end: adapter, OAuth, registry, fixtures, tests, docs |
| [`/ai-eval`](.claude/commands/ai-eval.md) | `[summarize\|draft\|prioritize\|all]` | Runs the chosen AI feature against the 8 fixture threads, prints a markdown quality report |
| [`/ship`](.claude/commands/ship.md) | — | Pre-ship sequence: typecheck → unit tests → build → e2e → security review → deploy command |

## Plugin — `.claude/plugins/universal-mail/`

A single plugin manifest [`plugin.json`](.claude/plugins/universal-mail/plugin.json) bundles the agents, skills, hooks, and commands above into one installable unit. Anyone forking this repo can `claude code plugin install ./.claude/plugins/universal-mail` and get the full development environment.

## Settings — `.claude/settings.json`

- Permissions allowlist: `npm`, `npx tsc`, `vitest`, `playwright`, common git ops, doc-only `WebFetch` for the four upstream API references we use
- Permissions denylist: `rm -rf`, `git push --force`, `git reset --hard`, `npm publish`, raw `curl` (block exfiltration vectors)
- Hooks wired to scripts above
- `DEMO_MODE=1` env injected so the dev loop runs without API keys

## How they fit together

A typical task — "add Fastmail JMAP support" — flows like this:

1. User: `/new-provider fastmail`
2. Slash command tells Claude to run the **new-mail-provider** skill, using the **mail-provider-engineer** agent
3. Each `Write` triggers the **forbid-secrets-in-source** hook (pre) and **post-edit-typecheck** hook (post)
4. When code is in place, the slash command hands off to the **test-engineer** agent
5. On `Stop`, the **on-stop-summary** hook surfaces typecheck + test results
6. Before commit, **pre-commit.sh** blocks anything red
7. Before merge, the user runs `/ship` which spawns the **security-reviewer**
