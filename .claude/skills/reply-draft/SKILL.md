---
name: reply-draft
description: Use this skill when generating a reply draft for an email thread, with a specified tone (concise / friendly / formal) and optional user instruction. Produces a plain-text body with no greeting or signature.
---

# Skill: reply-draft

Captures the production prompt shape used by `src/lib/ai/draft.ts`.

## When to use

- Generating a sample reply for documentation or screenshots.
- Debugging tone selection (why is "formal" producing the same output as "concise"?).
- Writing eval cases for the drafting feature.

## How to invoke

Call `claude-opus-4-7` (NOT haiku — drafts are user-visible and may be sent):

```ts
{
  model: 'claude-opus-4-7',
  max_tokens: 800,
  system: [{ type: 'text', text: EMAIL_AI_SYSTEM_TEXT, cache_control: { type: 'ephemeral' } }],
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: DRAFT_PROMPT(tone, instruction) },
      { type: 'text', text: lastNMessagesAsText },
    ],
  }],
}
```

## Output contract

```json
{
  "bodyText": "plain text reply, NO greeting, NO signature",
  "rationale": "one sentence: why this approach"
}
```

## Quality bar (these are hard rules in the prompt)

- **No greeting** ("Hi", "Hello", "I hope this finds you well") — the user adds their own.
- **No closing** ("Best,", "Thanks,", "[Name]") — the client appends signature.
- **Address every concrete ask** in the last message. If they ask 3 questions, answer 3.
- **Tone matches relationship.** Warm to family. Professional to a vendor. Friendly to a peer.
- **Length scales with tone**: concise 1–3 sentences, friendly 2–5, formal 3–6.

## What's different from summarize

- Uses Opus, not Haiku.
- Not cached — every regeneration is a fresh call.
- User instruction is freeform and goes inside the prompt, not the system block.
