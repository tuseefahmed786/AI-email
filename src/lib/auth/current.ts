import { getSession, listAccountsForUser } from './session';
import { providerForAccount } from '@/lib/providers/registry';
import type { MailAccount, MailProvider } from '@/types/mail';
import { DemoProvider } from '@/lib/providers/demo';

export const DEMO_ACCOUNT: MailAccount = {
  id: 'demo',
  provider: 'gmail',
  email: 'demo@example.com',
  displayName: 'Demo Inbox',
  color: '#6366f1',
};

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1';
}

export async function getCurrentAccounts(): Promise<MailAccount[]> {
  if (isDemoMode()) return [DEMO_ACCOUNT];
  const s = await getSession();
  if (!s) return [];
  const accounts = await listAccountsForUser(s.userId);
  return accounts.length ? accounts : [];
}

export async function getCurrentProviders(): Promise<MailProvider[]> {
  if (isDemoMode()) return [new DemoProvider(DEMO_ACCOUNT)];
  const accounts = await getCurrentAccounts();
  return accounts.map(providerForAccount);
}

export async function getActiveAccountId(): Promise<string | null> {
  if (isDemoMode()) return DEMO_ACCOUNT.id;
  const s = await getSession();
  if (!s) return null;
  return s.activeAccountId || s.accountIds[0] || null;
}
