---
name: email-thread-summarize
description: Use this skill when you need to summarize an email thread for a developer (e.g. to write a regression test, to author a fixture, or to debug summary output). Produces a one-line summary, fact bullets, and action items in the exact JSON shape the product uses.
---

# Skill: email-thread-summarize

This skill captures the **prompt shape** used by `src/lib/ai/summarize.ts` so other tools (evals, fixtures, screenshots) can produce comparable output.

## When to use

- You're authoring a new fixture thread and want to predict the summary shape.
- You're debugging why a thread produced a bad summary; run this skill manually with the raw text to inspect Claude's output.
- You're writing a regression test that asserts summary structure.

## When NOT to use

- For the production summarize endpoint — that's `POST /api/ai/summarize`.
- For long-form prose summaries — this returns terse JSON only.

## How to invoke

Call the Claude API (`claude-haiku-4-5`) with this exact structure:

```ts
{
  model: 'claude-haiku-4-5',
  max_tokens: 600,
  system: [{ type: 'text', text: EMAIL_AI_SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: SUMMARIZE_PROMPT },
      { type: 'text', text: threadText },
    ],
  }],
}
```

Where:
- `EMAIL_AI_SYSTEM_TEXT` is in `src/lib/ai/client.ts`
- `SUMMARIZE_PROMPT` is in `src/lib/ai/summarize.ts`
- `threadText` is built by `threadToText(thread)` — last 6 messages, capped at 4000 chars each

## Output contract

```json
{
  "oneLine": "≤ 18 words, what the thread is actually about",
  "bullets": ["concrete fact", "concrete fact"],
  "actionItems": ["imperative, addressed to the user"]
}
```

Empty `actionItems` array is valid and common (newsletters, notifications, FYI threads).

## Quality bar

- `oneLine` cites a specific entity from the thread, not a paraphrase ("ACME renewal: pricing due Friday" ≫ "discussion about a renewal").
- Bullets are facts the user can verify in the thread — never inferences.
- Action items are addressed to *the user*, imperative voice. "Reply to Priya by Thursday with 3-tier pricing" ≫ "follow up with Priya".
