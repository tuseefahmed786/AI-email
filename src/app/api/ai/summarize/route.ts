import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProviders } from '@/lib/auth/current';
import { summarizeThread } from '@/lib/ai/summarize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ threadId: z.string(), accountId: z.string().optional() });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const providers = await getCurrentProviders();
  const scoped = parsed.data.accountId ? providers.filter((p) => p.account.id === parsed.data.accountId) : providers;
  for (const p of scoped) {
    try {
      const thread = await p.getThread(parsed.data.threadId);
      const summary = await summarizeThread(thread);
      return NextResponse.json({ summary });
    } catch {
      // try next
    }
  }
  return NextResponse.json({ error: 'thread not found' }, { status: 404 });
}
