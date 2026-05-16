import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  attachAccountToUser,
  getSession,
  saveAccount,
  setImapCreds,
  setSession,
} from '@/lib/auth/session';
import { randomBytes } from 'node:crypto';

const Body = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  host: z.string().min(1),
  port: z.number().int().positive().default(993),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  pass: z.string().min(1),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().positive().optional(),
});

// Preset suggestions for the UI live in src/app/settings/page.tsx — Next.js
// route files only allow specific exports, so we don't re-export them here.

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const v = parsed.data;

  const accountId = `imap_${Buffer.from(v.email).toString('hex').slice(0, 16)}`;
  await saveAccount({
    id: accountId,
    provider: 'imap',
    email: v.email,
    displayName: v.displayName,
    color: '#9333ea',
  });
  await setImapCreds(accountId, {
    host: v.host,
    port: v.port,
    secure: v.secure,
    user: v.user,
    pass: v.pass,
    smtpHost: v.smtpHost,
    smtpPort: v.smtpPort,
  });

  const session = (await getSession()) || { userId: randomBytes(8).toString('hex'), accountIds: [] };
  await attachAccountToUser(session.userId, accountId);
  if (!session.accountIds.includes(accountId)) session.accountIds.push(accountId);
  session.activeAccountId = accountId;
  await setSession(session);

  return NextResponse.json({ ok: true, accountId });
}
