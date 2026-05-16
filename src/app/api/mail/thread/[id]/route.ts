import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProviders } from '@/lib/auth/current';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const accountId = req.nextUrl.searchParams.get('accountId');
  const providers = await getCurrentProviders();
  const scoped = accountId ? providers.filter((p) => p.account.id === accountId) : providers;
  for (const p of scoped) {
    try {
      const thread = await p.getThread(id);
      return NextResponse.json({ thread });
    } catch {
      // try next provider
    }
  }
  return NextResponse.json({ error: 'thread not found' }, { status: 404 });
}
