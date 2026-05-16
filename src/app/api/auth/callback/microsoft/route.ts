import { NextRequest, NextResponse } from 'next/server';
import {
  attachAccountToUser,
  getSession,
  saveAccount,
  setSession,
  setTokens,
} from '@/lib/auth/session';
import { randomBytes } from 'node:crypto';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/?error=no_code', req.url));

  const tenant = process.env.MICROSOFT_TENANT || 'common';
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || '',
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.APP_URL}/api/auth/callback/microsoft`,
      scope: 'openid profile email offline_access User.Read Mail.ReadWrite Mail.Send',
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL('/?error=ms_token', req.url));
  const tok = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token: string;
  };

  // Decode id_token payload (we don't need to verify here — it's our own callback).
  const payload = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64').toString('utf8')) as {
    email?: string;
    preferred_username?: string;
    name?: string;
  };
  const email = payload.email || payload.preferred_username!;
  const name = payload.name || email;
  const accountId = `ms_${Buffer.from(email).toString('hex').slice(0, 16)}`;

  await saveAccount({
    id: accountId,
    provider: 'microsoft',
    email,
    displayName: name,
    color: '#0078d4',
  });
  await setTokens(accountId, {
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token,
    expiresAt: Date.now() + tok.expires_in * 1000,
  });

  const session = (await getSession()) || { userId: randomBytes(8).toString('hex'), accountIds: [] };
  await attachAccountToUser(session.userId, accountId);
  if (!session.accountIds.includes(accountId)) session.accountIds.push(accountId);
  session.activeAccountId = accountId;
  await setSession(session);

  return NextResponse.redirect(new URL('/', req.url));
}
