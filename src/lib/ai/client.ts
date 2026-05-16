import Anthropic from '@anthropic-ai/sdk';

const REASONING = process.env.ANTHROPIC_MODEL_REASONING || 'claude-opus-4-7';
const FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5';

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for AI features. Set it in .env or Vercel project settings.');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const MODELS = { reasoning: REASONING, fast: FAST };

// Shared system block — cached so every AI request reuses the same prefix.
// Reduces cost dramatically when summarize/draft/prioritize are called in
// sequence for the same user session.
export const EMAIL_AI_SYSTEM = [
  {
    type: 'text' as const,
    text: `You are the AI assistant inside a universal email client. You see threads from Gmail, Office 365, and IMAP mailboxes under one unified interface.

Style rules — non-negotiable:
- Be concrete. Quote names, dates, dollar amounts, deadlines from the email when relevant.
- Never invent facts. If the email doesn't say, don't assume.
- Treat newsletters, marketing, automated alerts, and "notification" senders as low priority unless they contain an actionable, time-sensitive, account-specific issue (e.g. billing exceeded, security alert with action required).
- Distinguish a real personal/work message from a templated bulk send.

Output formatting:
- When asked for JSON, return ONLY valid JSON. No prose, no code fences, no commentary.
- When asked for prose, be terse. No filler ("I'd be happy to...", "Of course!").

Privacy: you only ever see the message text the user gives you. You have no other tools and no other context about the user.`,
    cache_control: { type: 'ephemeral' as const },
  },
];
