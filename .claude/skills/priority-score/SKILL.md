---
name: priority-score
description: Use this skill when scoring an array of email threads into urgent/important/normal/low buckets. Produces a JSON array, one entry per thread, with a 0-100 score and a ≤12-word reason citing thread content.
---

# Skill: priority-score

Captures the production prompt shape used by `src/lib/ai/prioritize.ts`.

## When to use

- Building eval cases for the prioritizer.
- Spot-checking a thread that's classifying wrong in the demo.
- Writing fixtures designed to land in a specific bucket.

## How to invoke

Single batched call to `claude-haiku-4-5` with up to 30 thread briefs:

```ts
{
  model: 'claude-haiku-4-5',
  max_tokens: 1500,
  system: [{ type: 'text', text: EMAIL_AI_SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: PRIORITIZE_PROMPT },
      { type: 'text', text: JSON.stringify(threadBriefs, null, 2) },
    ],
  }],
}
```

Each `threadBrief` has: `threadId`, `from`, `subject`, `snippet (≤600 chars)`, `date`.

## Output contract

```json
[
  { "threadId": "...", "score": 0-100, "bucket": "urgent|important|normal|low", "reason": "≤12 words" }
]
```

## Bucket calibration

- **urgent (90+)** — explicit deadline within 24h, security/billing alert with action required, real consequence if ignored
- **important (60–89)** — real human asking for a real reply, no immediate deadline
- **normal (30–59)** — informational, user probably wants to read but not act
- **low (0–29)** — newsletters, marketing, no-reply automation, unsolicited recruiting templates

## Tells (signals the prompt uses)

- "no-reply", "noreply", `{{firstName}}`, "unsubscribe" → low
- "EOD", "by Friday", "deadline", "before [date]" → urgent
- "$N exceeded", "action required", "new sign-in" → urgent (billing/security)
- "Re:" prefix from a known human → important minimum
