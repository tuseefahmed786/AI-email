import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProviders } from '@/lib/auth/current';
import type { MailThread } from '@/types/mail';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const labelId = req.nextUrl.searchParams.get('label') || 'INBOX';
  const accountId = req.nextUrl.searchParams.get('accountId');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
  const providers = await getCurrentProviders();
  const scoped = accountId ? providers.filter((p) => p.account.id === accountId) : providers;
  if (scoped.length === 0) return NextResponse.json({ threads: [] });

  const results = await Promise.allSettled(
    scoped.map((p) => p.listThreads({ labelId, limit })),
  );
  const threads: MailThread[] = [];
  const errors: { accountId: string; message: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') threads.push(...r.value.threads);
    else errors.push({ accountId: scoped[i].account.id, message: String(r.reason).slice(0, 200) });
  });
  threads.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return NextResponse.json({ threads: threads.slice(0, limit), errors });
}
