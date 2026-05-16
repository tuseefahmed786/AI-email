import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { MailAccount } from '@/types/mail';
import { kvGet, kvSet, kvDel } from '@/lib/db/kv';

const COOKIE = 'uni_session';
const ALG = 'HS256';

function secret() {
  const s = process.env.SESSION_SECRET || 'dev-only-do-not-use-in-production-please-change-me';
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  userId: string;
  accountIds: string[];
  activeAccountId?: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const tok = jar.get(COOKIE)?.value;
  if (!tok) return null;
  try {
    const { payload } = await jwtVerify(tok, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSession(p: SessionPayload): Promise<void> {
  const tok = await new SignJWT({ ...p })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, tok, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function saveAccount(a: MailAccount): Promise<void> {
  await kvSet(`account:${a.id}`, a);
}

export async function getAccount(id: string): Promise<MailAccount | null> {
  return kvGet<MailAccount>(`account:${id}`);
}

export async function listAccountsForUser(userId: string): Promise<MailAccount[]> {
  const ids = (await kvGet<string[]>(`user:${userId}:accounts`)) || [];
  const accounts = await Promise.all(ids.map((id) => kvGet<MailAccount>(`account:${id}`)));
  return accounts.filter(Boolean) as MailAccount[];
}

export async function attachAccountToUser(userId: string, accountId: string): Promise<void> {
  const ids = (await kvGet<string[]>(`user:${userId}:accounts`)) || [];
  if (!ids.includes(accountId)) ids.push(accountId);
  await kvSet(`user:${userId}:accounts`, ids);
}

export async function removeAccount(userId: string, accountId: string): Promise<void> {
  const ids = (await kvGet<string[]>(`user:${userId}:accounts`)) || [];
  await kvSet(`user:${userId}:accounts`, ids.filter((x) => x !== accountId));
  await kvDel(`account:${accountId}`);
  await kvDel(`tokens:${accountId}`);
  await kvDel(`imap:${accountId}`);
}

// ─── Provider credentials ────────────────────────────────────────────────────

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export async function getTokens(accountId: string): Promise<OAuthTokens | null> {
  return kvGet<OAuthTokens>(`tokens:${accountId}`);
}

export async function setTokens(accountId: string, t: OAuthTokens): Promise<void> {
  await kvSet(`tokens:${accountId}`, t);
}

export interface ImapCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  smtpHost?: string;
  smtpPort?: number;
}

export async function getImapCreds(accountId: string): Promise<ImapCreds | null> {
  return kvGet<ImapCreds>(`imap:${accountId}`);
}

export async function setImapCreds(accountId: string, c: ImapCreds): Promise<void> {
  await kvSet(`imap:${accountId}`, c);
}
