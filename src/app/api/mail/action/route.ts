import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProviders } from '@/lib/auth/current';
import type { MailAction } from '@/types/mail';

const Body = z.object({
  accountId: z.string(),
  action: z.object({
    kind: z.enum(['archive', 'delete', 'markRead', 'markUnread', 'star', 'unstar', 'addLabel', 'removeLabel']),
    threadId: z.string().optional(),
    messageId: z.string().optional(),
    labelId: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const providers = await getCurrentProviders();
  const p = providers.find((x) => x.account.id === parsed.data.accountId);
  if (!p) return NextResponse.json({ error: 'account not found' }, { status: 404 });
  await p.applyAction(parsed.data.action as MailAction);
  return NextResponse.json({ ok: true });
}
