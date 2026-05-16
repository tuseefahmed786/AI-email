import type { MailAccount, MailProvider } from '@/types/mail';
import { GmailProvider } from './gmail';
import { MicrosoftProvider } from './microsoft';
import { ImapProvider } from './imap';
import { DemoProvider } from './demo';
import { getAccount } from '@/lib/auth/session';

const isDemoMode = () => process.env.DEMO_MODE === '1' || !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_CLIENT_ID;

export async function getProvider(accountId: string): Promise<MailProvider> {
  if (isDemoMode()) {
    return new DemoProvider({
      id: accountId || 'demo',
      provider: 'gmail',
      email: 'demo@example.com',
      displayName: 'Demo Inbox',
      color: '#6366f1',
    });
  }
  const account = await getAccount(accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);
  switch (account.provider) {
    case 'gmail':
      return new GmailProvider(account);
    case 'microsoft':
      return new MicrosoftProvider(account);
    case 'imap':
      return new ImapProvider(account);
  }
}

export async function getAllProviders(accountIds: string[]): Promise<MailProvider[]> {
  return Promise.all(accountIds.map((id) => getProvider(id)));
}

export function providerForAccount(account: MailAccount): MailProvider {
  switch (account.provider) {
    case 'gmail':
      return new GmailProvider(account);
    case 'microsoft':
      return new MicrosoftProvider(account);
    case 'imap':
      return new ImapProvider(account);
  }
}
