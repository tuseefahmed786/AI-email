import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProviders } from '@/lib/auth/current';
import type { MailThread } from '@/types/mail';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
  if (!q.trim()) return NextResponse.json({ threads: [] });
  const providers = await getCurrentProviders();
  const results = await Promise.allSettled(providers.map((p) => p.search(q, { limit })));
  const threads: MailThread[] = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') threads.push(...r.value.threads);
  });
  threads.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return NextResponse.json({ threads: threads.slice(0, limit) });
}
