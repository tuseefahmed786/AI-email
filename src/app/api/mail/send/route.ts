import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProviders } from '@/lib/auth/current';

const Body = z.object({
  accountId: z.string(),
  to: z.array(z.object({ name: z.string().optional(), email: z.string().email() })),
  cc: z.array(z.object({ name: z.string().optional(), email: z.string().email() })).optional(),
  subject: z.string(),
  bodyText: z.string(),
  inReplyToMessageId: z.string().optional(),
  threadId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const providers = await getCurrentProviders();
  const p = providers.find((x) => x.account.id === parsed.data.accountId);
  if (!p) return NextResponse.json({ error: 'account not found' }, { status: 404 });
  const res = await p.send(parsed.data);
  return NextResponse.json(res);
}
