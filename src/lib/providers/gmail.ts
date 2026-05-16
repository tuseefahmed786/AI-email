import type {
  MailAccount,
  MailAction,
  MailLabel,
  MailProvider,
  MailThread,
  MailMessage,
  MailAddress,
  ListOptions,
  ListResult,
  SendOptions,
} from '@/types/mail';
import { google, type gmail_v1 } from 'googleapis';
import { getTokens, setTokens } from '@/lib/auth/session';

function parseAddress(raw?: string): MailAddress | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
  return { email: raw.trim() };
}

function parseAddresses(raw?: string): MailAddress[] {
  if (!raw) return [];
  return raw
    .split(/,(?![^<]*>)/g)
    .map(parseAddress)
    .filter(Boolean) as MailAddress[];
}

function decodePart(data?: string): string {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload?: gmail_v1.Schema$MessagePart): { html?: string; text?: string } {
  if (!payload) return {};
  if (!payload.parts) {
    if (payload.mimeType === 'text/html') return { html: decodePart(payload.body?.data || undefined) };
    return { text: decodePart(payload.body?.data || undefined) };
  }
  let html: string | undefined;
  let text: string | undefined;
  const walk = (parts: gmail_v1.Schema$MessagePart[]) => {
    for (const p of parts) {
      if (p.mimeType === 'text/html' && p.body?.data) html ||= decodePart(p.body.data);
      else if (p.mimeType === 'text/plain' && p.body?.data) text ||= decodePart(p.body.data);
      if (p.parts) walk(p.parts);
    }
  };
  walk(payload.parts);
  return { html, text };
}

function headerMap(headers?: gmail_v1.Schema$MessagePartHeader[]) {
  const h: Record<string, string> = {};
  for (const x of headers || []) if (x.name && x.value) h[x.name.toLowerCase()] = x.value;
  return h;
}

function toMessage(account: MailAccount, m: gmail_v1.Schema$Message): MailMessage {
  const h = headerMap(m.payload?.headers || undefined);
  const body = extractBody(m.payload || undefined);
  return {
    id: m.id || '',
    threadId: m.threadId || '',
    accountId: account.id,
    from: parseAddress(h.from) || { email: '' },
    to: parseAddresses(h.to),
    cc: parseAddresses(h.cc),
    bcc: parseAddresses(h.bcc),
    subject: h.subject || '(no subject)',
    snippet: m.snippet || '',
    bodyHtml: body.html,
    bodyText: body.text,
    date: new Date(parseInt(m.internalDate || '0', 10)).toISOString(),
    unread: (m.labelIds || []).includes('UNREAD'),
    starred: (m.labelIds || []).includes('STARRED'),
    labels: m.labelIds || [],
  };
}

export class GmailProvider implements MailProvider {
  kind = 'gmail' as const;
  account: MailAccount;
  private clientPromise: Promise<gmail_v1.Gmail>;

  constructor(account: MailAccount) {
    this.account = account;
    this.clientPromise = this.build();
  }

  private async build(): Promise<gmail_v1.Gmail> {
    const tokens = await getTokens(this.account.id);
    if (!tokens) throw new Error('Gmail tokens missing for account ' + this.account.id);
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL || ''}/api/auth/callback/gmail`,
    );
    oauth2.setCredentials({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken, expiry_date: tokens.expiresAt });
    oauth2.on('tokens', async (t) => {
      await setTokens(this.account.id, {
        accessToken: t.access_token || tokens.accessToken,
        refreshToken: t.refresh_token || tokens.refreshToken,
        expiresAt: t.expiry_date || tokens.expiresAt,
      });
    });
    return google.gmail({ version: 'v1', auth: oauth2 });
  }

  async listThreads({ labelId = 'INBOX', limit = 50, pageToken, query }: ListOptions): Promise<ListResult> {
    const gmail = await this.clientPromise;
    const res = await gmail.users.threads.list({
      userId: 'me',
      labelIds: query ? undefined : [labelId],
      q: query,
      maxResults: limit,
      pageToken,
    });
    const ids = res.data.threads || [];
    const threads = await Promise.all(
      ids.map(async (t) => {
        const full = await gmail.users.threads.get({ userId: 'me', id: t.id!, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
        const msgs = (full.data.messages || []).map((m) => toMessage(this.account, m));
        const last = msgs[msgs.length - 1] || msgs[0];
        const participants = Array.from(
          new Map(msgs.flatMap((m) => [m.from, ...m.to]).filter(Boolean).map((p) => [p.email, p])).values(),
        );
        return {
          id: full.data.id!,
          accountId: this.account.id,
          subject: last?.subject || '(no subject)',
          participants,
          snippet: full.data.snippet || '',
          date: last?.date || new Date().toISOString(),
          unread: msgs.some((m) => m.unread),
          messageCount: msgs.length,
          labels: Array.from(new Set(msgs.flatMap((m) => m.labels))),
        } as MailThread;
      }),
    );
    return { threads, nextPageToken: res.data.nextPageToken || undefined };
  }

  async getThread(threadId: string): Promise<MailThread> {
    const gmail = await this.clientPromise;
    const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
    const messages = (res.data.messages || []).map((m) => toMessage(this.account, m));
    const last = messages[messages.length - 1];
    return {
      id: res.data.id!,
      accountId: this.account.id,
      subject: last?.subject || '(no subject)',
      participants: Array.from(
        new Map(messages.flatMap((m) => [m.from, ...m.to]).filter(Boolean).map((p) => [p.email, p])).values(),
      ),
      snippet: res.data.snippet || '',
      date: last?.date || new Date().toISOString(),
      unread: messages.some((m) => m.unread),
      messageCount: messages.length,
      labels: Array.from(new Set(messages.flatMap((m) => m.labels))),
      messages,
    };
  }

  async search(query: string, opts: ListOptions = {}): Promise<ListResult> {
    return this.listThreads({ ...opts, query });
  }

  async listLabels(): Promise<MailLabel[]> {
    const gmail = await this.clientPromise;
    const res = await gmail.users.labels.list({ userId: 'me' });
    return (res.data.labels || []).map((l) => ({
      id: l.id!,
      name: l.name || l.id!,
      kind: l.type === 'system' ? 'system' : 'user',
    }));
  }

  async send(msg: SendOptions): Promise<{ id: string; threadId: string }> {
    const gmail = await this.clientPromise;
    const lines = [
      `From: ${this.account.displayName} <${this.account.email}>`,
      `To: ${msg.to.map(formatAddr).join(', ')}`,
      msg.cc?.length ? `Cc: ${msg.cc.map(formatAddr).join(', ')}` : '',
      `Subject: ${msg.subject}`,
      msg.inReplyToMessageId ? `In-Reply-To: <${msg.inReplyToMessageId}>` : '',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      msg.bodyText,
    ].filter(Boolean).join('\r\n');
    const raw = Buffer.from(lines).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, threadId: msg.threadId },
    });
    return { id: res.data.id!, threadId: res.data.threadId! };
  }

  async applyAction(action: MailAction): Promise<void> {
    const gmail = await this.clientPromise;
    if (!action.threadId) return;
    const ops: Record<MailAction['kind'], () => Promise<unknown>> = {
      archive: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { removeLabelIds: ['INBOX'] } }),
      delete: () => gmail.users.threads.trash({ userId: 'me', id: action.threadId! }),
      markRead: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { removeLabelIds: ['UNREAD'] } }),
      markUnread: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { addLabelIds: ['UNREAD'] } }),
      star: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { addLabelIds: ['STARRED'] } }),
      unstar: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { removeLabelIds: ['STARRED'] } }),
      addLabel: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { addLabelIds: [action.labelId!] } }),
      removeLabel: () => gmail.users.threads.modify({ userId: 'me', id: action.threadId!, requestBody: { removeLabelIds: [action.labelId!] } }),
    };
    await ops[action.kind]();
  }
}

function formatAddr(a: MailAddress) {
  return a.name ? `"${a.name}" <${a.email}>` : a.email;
}
