import { NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/auth/session';
import { randomBytes } from 'node:crypto';

export async function GET() {
  if (!process.env.MICROSOFT_CLIENT_ID) {
    return NextResponse.json({ error: 'Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID/SECRET.' }, { status: 500 });
  }
  const session = (await getSession()) || { userId: randomBytes(8).toString('hex'), accountIds: [] };
  if (!(await getSession())) await setSession(session);

  const tenant = process.env.MICROSOFT_TENANT || 'common';
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${process.env.APP_URL}/api/auth/callback/microsoft`,
    response_mode: 'query',
    scope: 'openid profile email offline_access User.Read Mail.ReadWrite Mail.Send',
    prompt: 'select_account',
  });
  return NextResponse.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`);
}
