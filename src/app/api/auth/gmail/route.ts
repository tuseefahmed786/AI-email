import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession, setSession } from '@/lib/auth/session';
import { randomBytes } from 'node:crypto';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: 'Gmail OAuth not configured. Set GOOGLE_CLIENT_ID/SECRET.' }, { status: 500 });
  }
  // Bootstrap a session on first connect so we have a userId to attach to.
  const session = (await getSession()) || { userId: randomBytes(8).toString('hex'), accountIds: [] };
  if (!(await getSession())) await setSession(session);

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/callback/gmail`,
  );
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  return NextResponse.redirect(url);
}
