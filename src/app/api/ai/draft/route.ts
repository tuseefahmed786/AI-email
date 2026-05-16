import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProviders } from '@/lib/auth/current';
import { draftReply } from '@/lib/ai/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  threadId: z.string(),
  accountId: z.string().optional(),
  tone: z.enum(['concise', 'friendly', 'formal']).default('friendly'),
  instruction: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const providers = await getCurrentProviders();
  const scoped = parsed.data.accountId ? providers.filter((p) => p.account.id === parsed.data.accountId) : providers;
  for (const p of scoped) {
    try {
      const thread = await p.getThread(parsed.data.threadId);
      const draft = await draftReply(thread, parsed.data.tone, parsed.data.instruction);
      return NextResponse.json({ draft });
    } catch {
      // try next
    }
  }
  return NextResponse.json({ error: 'thread not found' }, { status: 404 });
}
