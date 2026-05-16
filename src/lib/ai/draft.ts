import type { MailThread, AIDraft } from '@/types/mail';
import { anthropic, MODELS, EMAIL_AI_SYSTEM } from './client';

const DRAFT_PROMPT = (tone: AIDraft['tone'], instruction?: string) => `Draft a reply to the LAST message in this thread.

Tone: ${tone}
${instruction ? `Extra direction from the user: ${instruction}` : ''}

Rules:
- Match the relationship: a "concise" reply to mom should still be warm; a "formal" reply to a vendor should still be human.
- Address every concrete question/request in the last message. If the email has multiple asks, answer all of them.
- No greetings like "I hope this finds you well". No closings like "Best regards, [Name]" — the sender's mail client adds the signature.
- ${tone === 'concise' ? 'Aim for 1-3 sentences.' : tone === 'friendly' ? 'Aim for 2-5 sentences, conversational.' : 'Aim for 3-6 sentences, professional but not stiff.'}

Return JSON:
{
  "bodyText": "...",   // the reply body, plain text, NO signature
  "rationale": "..."   // one short sentence on why you chose this approach
}`;

function lastN(thread: MailThread, n: number): string {
  const msgs = (thread.messages || []).slice(-n);
  return msgs
    .map((m) => {
      const sender = m.from.name ? `${m.from.name} <${m.from.email}>` : m.from.email;
      return `From: ${sender}\nDate: ${m.date}\nSubject: ${m.subject}\n\n${(m.bodyText || m.snippet || '').slice(0, 4000)}`;
    })
    .join('\n\n---\n\n');
}

export async function draftReply(
  thread: MailThread,
  tone: AIDraft['tone'] = 'friendly',
  instruction?: string,
): Promise<AIDraft> {
  const res = await anthropic().messages.create({
    model: MODELS.reasoning,
    max_tokens: 800,
    system: EMAIL_AI_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: DRAFT_PROMPT(tone, instruction) },
          { type: 'text', text: lastN(thread, 4) },
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
  return {
    tone,
    bodyText: parsed.bodyText || '',
    rationale: parsed.rationale,
  };
}

import type Anthropic from '@anthropic-ai/sdk';

function safeParse(s: string): { bodyText?: string; rationale?: string } {
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return { bodyText: s };
      }
    }
    return { bodyText: s };
  }
}
