import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
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

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/callback/gmail`,
  );
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
  const userInfo = await oauth2Api.userinfo.get();
  const email = userInfo.data.email!;
  const name = userInfo.data.name || email;

  const accountId = `gmail_${Buffer.from(email).toString('hex').slice(0, 16)}`;
  await saveAccount({
    id: accountId,
    provider: 'gmail',
    email,
    displayName: name,
    color: '#ea4335',
  });
  await setTokens(accountId, {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token || undefined,
    expiresAt: tokens.expiry_date || undefined,
  });

  const session = (await getSession()) || { userId: randomBytes(8).toString('hex'), accountIds: [] };
  await attachAccountToUser(session.userId, accountId);
  if (!session.accountIds.includes(accountId)) session.accountIds.push(accountId);
  session.activeAccountId = accountId;
  await setSession(session);

  return NextResponse.redirect(new URL('/', req.url));
}
