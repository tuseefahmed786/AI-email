import type { MailThread, AISummary } from '@/types/mail';
import { anthropic, MODELS, EMAIL_AI_SYSTEM } from './client';
import { kvGet, kvSet } from '@/lib/db/kv';

const SUMMARIZE_PROMPT = `Summarize this email thread for someone catching up fast.

Return JSON:
{
  "oneLine": "...",            // single sentence, <= 18 words, what the thread is actually about
  "bullets": ["...", "..."],   // 2-4 concrete bullets, facts only
  "actionItems": ["..."]       // 0-3 things THE USER must do, imperative voice. Empty array if none.
}`;

function threadToText(thread: MailThread): string {
  const msgs = thread.messages || [];
  return msgs
    .slice(-6)
    .map((m, i) => {
      const sender = m.from.name ? `${m.from.name} <${m.from.email}>` : m.from.email;
      const body = (m.bodyText || m.snippet || '').slice(0, 4000);
      return `--- message ${i + 1} from ${sender} on ${m.date} ---\nSubject: ${m.subject}\n\n${body}`;
    })
    .join('\n\n');
}

export async function summarizeThread(thread: MailThread): Promise<AISummary> {
  const cacheKey = `summary:${thread.id}:${thread.messageCount}:${thread.date}`;
  const cached = await kvGet<AISummary>(cacheKey);
  if (cached) return cached;

  const res = await anthropic().messages.create({
    model: MODELS.fast,
    max_tokens: 600,
    system: EMAIL_AI_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SUMMARIZE_PROMPT },
          { type: 'text', text: threadToText(thread) },
        ],
      },
    ],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  const parsed = safeParse(text);
  const summary: AISummary = {
    threadId: thread.id,
    oneLine: parsed.oneLine || thread.subject,
    bullets: parsed.bullets || [],
    actionItems: parsed.actionItems || [],
    generatedAt: new Date().toISOString(),
  };
  await kvSet(cacheKey, summary);
  return summary;
}

import type Anthropic from '@anthropic-ai/sdk';

function safeParse(s: string): { oneLine?: string; bullets?: string[]; actionItems?: string[] } {
  try {
    return JSON.parse(s);
  } catch {
    // Tolerate ```json fences if model misbehaves.
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}
