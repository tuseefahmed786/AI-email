import type { MailThread, AIPriority } from '@/types/mail';
import { anthropic, MODELS, EMAIL_AI_SYSTEM } from './client';
import { kvGet, kvSet } from '@/lib/db/kv';

const PRIORITIZE_PROMPT = `You will receive an array of email threads. For each, score how urgently the user needs to act.

Buckets:
- "urgent"    — needs action within 24h, has a real deadline, or is a security/billing/legal issue with consequences if ignored.
- "important" — real human asking for a real reply, no immediate deadline.
- "normal"    — informational thread the user probably wants to read but doesn't need to act on.
- "low"       — newsletters, marketing, automated notifications without action required, "no-reply" senders.

Return JSON array, same length and order as input:
[
  { "threadId": "...", "score": 0-100, "bucket": "urgent|important|normal|low", "reason": "<= 12 words" }
]

Score guidance: 90+ urgent, 60-89 important, 30-59 normal, 0-29 low. Reason must cite something concrete from the thread.`;

function brief(t: MailThread): { threadId: string; from: string; subject: string; snippet: string; date: string } {
  const last = (t.messages || [])[t.messages?.length ? t.messages.length - 1 : 0];
  const fromAddr = last?.from || t.participants[0];
  return {
    threadId: t.id,
    from: fromAddr ? `${fromAddr.name || ''} <${fromAddr.email}>` : '',
    subject: t.subject,
    snippet: (last?.bodyText || last?.snippet || t.snippet || '').slice(0, 600),
    date: t.date,
  };
}

export async function prioritizeThreads(threads: MailThread[]): Promise<AIPriority[]> {
  if (threads.length === 0) return [];
  const cacheKey = `prio:${threads.map((t) => `${t.id}@${t.date}`).join('|').slice(0, 256)}`;
  const cached = await kvGet<AIPriority[]>(cacheKey);
  if (cached) return cached;

  const payload = threads.map(brief);
  const res = await anthropic().messages.create({
    model: MODELS.fast,
    max_tokens: 1500,
    system: EMAIL_AI_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PRIORITIZE_PROMPT },
          { type: 'text', text: JSON.stringify(payload, null, 2) },
        ],
      },
    ],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  let parsed: AIPriority[] = [];
  try {
    const json = text.match(/\[[\s\S]*\]/)?.[0] || text;
    parsed = JSON.parse(json);
  } catch {
    parsed = threads.map((t) => ({ threadId: t.id, score: 50, bucket: 'normal', reason: 'unscored' }));
  }
  // Ensure every input thread has a row, in case the model dropped any.
  const byId = new Map(parsed.map((p) => [p.threadId, p]));
  const ordered = threads.map(
    (t) => byId.get(t.id) || { threadId: t.id, score: 50, bucket: 'normal' as const, reason: 'unscored' },
  );
  await kvSet(cacheKey, ordered);
  return ordered;
}

import type Anthropic from '@anthropic-ai/sdk';
