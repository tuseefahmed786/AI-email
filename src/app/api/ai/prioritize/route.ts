import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProviders } from '@/lib/auth/current';
import { prioritizeThreads } from '@/lib/ai/prioritize';
import type { MailThread } from '@/types/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ threadIds: z.array(z.string()).max(50).optional(), label: z.string().default('INBOX') });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const providers = await getCurrentProviders();
  if (providers.length === 0) return NextResponse.json({ priorities: [] });

  const threads: MailThread[] = [];
  for (const p of providers) {
    const r = await p.listThreads({ labelId: parsed.data.label, limit: 30 });
    threads.push(...r.threads);
  }
  const filtered = parsed.data.threadIds
    ? threads.filter((t) => parsed.data.threadIds!.includes(t.id))
    : threads;
  if (filtered.length === 0) return NextResponse.json({ priorities: [] });

  // Hydrate the first message body so the model can judge content quality.
  const hydrated = await Promise.all(
    filtered.slice(0, 30).map(async (t) => {
      if (t.messages?.length) return t;
      try {
        const p = providers.find((x) => x.account.id === t.accountId);
        return p ? await p.getThread(t.id) : t;
      } catch {
        return t;
      }
    }),
  );
  const priorities = await prioritizeThreads(hydrated);
  return NextResponse.json({ priorities });
}
