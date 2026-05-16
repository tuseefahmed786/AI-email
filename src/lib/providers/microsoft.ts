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
import { Client } from '@microsoft/microsoft-graph-client';
import { getTokens, setTokens } from '@/lib/auth/session';

interface GraphMessage {
  id: string;
  conversationId: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content: string; contentType: 'html' | 'text' };
  from?: { emailAddress: { name?: string; address: string } };
  toRecipients?: { emailAddress: { name?: string; address: string } }[];
  ccRecipients?: { emailAddress: { name?: string; address: string } }[];
  receivedDateTime: string;
  isRead: boolean;
  flag?: { flagStatus?: string };
  categories?: string[];
  parentFolderId?: string;
}

function addr(a?: { name?: string; address: string }): MailAddress {
  return { name: a?.name, email: a?.address || '' };
}

function toMessage(account: MailAccount, m: GraphMessage): MailMessage {
  return {
    id: m.id,
    threadId: m.conversationId,
    accountId: account.id,
    from: m.from ? addr(m.from.emailAddress) : { email: '' },
    to: (m.toRecipients || []).map((r) => addr(r.emailAddress)),
    cc: (m.ccRecipients || []).map((r) => addr(r.emailAddress)),
    subject: m.subject || '(no subject)',
    snippet: m.bodyPreview || '',
    bodyHtml: m.body?.contentType === 'html' ? m.body.content : undefined,
    bodyText: m.body?.contentType === 'text' ? m.body.content : undefined,
    date: m.receivedDateTime,
    unread: !m.isRead,
    starred: m.flag?.flagStatus === 'flagged',
    labels: m.categories || [],
  };
}

export class MicrosoftProvider implements MailProvider {
  kind = 'microsoft' as const;
  account: MailAccount;

  constructor(account: MailAccount) {
    this.account = account;
  }

  private async client(): Promise<Client> {
    const tokens = await getTokens(this.account.id);
    if (!tokens) throw new Error('Microsoft tokens missing for account ' + this.account.id);
    // For simplicity we trust the stored access token; refresh handling is done
    // at the OAuth callback layer and on 401 from the API.
    return Client.init({
      authProvider: (done) => done(null, tokens.accessToken),
    });
  }

  async listThreads({ labelId = 'inbox', limit = 50, query }: ListOptions): Promise<ListResult> {
    const client = await this.client();
    const folder = labelId.toLowerCase() === 'inbox' ? 'inbox' : labelId;
    let path = `/me/mailFolders/${folder}/messages`;
    const params: string[] = [`$top=${Math.min(limit, 50)}`, '$orderby=receivedDateTime desc'];
    if (query) {
      path = '/me/messages';
      params.push(`$search="${query.replace(/"/g, '')}"`);
    } else {
      params.push('$select=id,conversationId,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,flag,categories');
    }
    const res = await client.api(`${path}?${params.join('&')}`).get();
    const msgs: GraphMessage[] = res.value || [];

    const byConv = new Map<string, GraphMessage[]>();
    for (const m of msgs) {
      const arr = byConv.get(m.conversationId) || [];
      arr.push(m);
      byConv.set(m.conversationId, arr);
    }

    const threads: MailThread[] = [];
    for (const [convId, conv] of byConv) {
      const last = conv[0];
      threads.push({
        id: convId,
        accountId: this.account.id,
        subject: last.subject || '(no subject)',
        participants: Array.from(
          new Map(
            conv
              .flatMap((m) => [m.from?.emailAddress, ...(m.toRecipients || []).map((t) => t.emailAddress)])
              .filter(Boolean)
              .map((a) => [a!.address, addr(a!)]),
          ).values(),
        ),
        snippet: last.bodyPreview || '',
        date: last.receivedDateTime,
        unread: conv.some((m) => !m.isRead),
        messageCount: conv.length,
        labels: Array.from(new Set(conv.flatMap((m) => m.categories || []).concat(['INBOX']))),
      });
    }
    return { threads };
  }

  async getThread(threadId: string): Promise<MailThread> {
    const client = await this.client();
    const res = await client
      .api(`/me/messages?$filter=conversationId eq '${threadId}'&$orderby=receivedDateTime asc&$top=50`)
      .get();
    const messages = ((res.value || []) as GraphMessage[]).map((m) => toMessage(this.account, m));
    const last = messages[messages.length - 1];
    return {
      id: threadId,
      accountId: this.account.id,
      subject: last?.subject || '(no subject)',
      participants: Array.from(
        new Map(messages.flatMap((m) => [m.from, ...m.to]).map((p) => [p.email, p])).values(),
      ),
      snippet: last?.snippet || '',
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
    const client = await this.client();
    const res = await client.api('/me/mailFolders').get();
    return (res.value || []).map((f: { id: string; displayName: string; wellKnownName?: string }) => ({
      id: f.id,
      name: f.displayName,
      kind: f.wellKnownName ? 'system' : 'user',
    }));
  }

  async send(msg: SendOptions): Promise<{ id: string; threadId: string }> {
    const client = await this.client();
    const payload = {
      message: {
        subject: msg.subject,
        body: { contentType: 'Text', content: msg.bodyText },
        toRecipients: msg.to.map((r) => ({ emailAddress: { address: r.email, name: r.name } })),
        ccRecipients: (msg.cc || []).map((r) => ({ emailAddress: { address: r.email, name: r.name } })),
      },
      saveToSentItems: true,
    };
    await client.api('/me/sendMail').post(payload);
    return { id: `sent_${Date.now()}`, threadId: msg.threadId || `t_${Date.now()}` };
  }

  async applyAction(action: MailAction): Promise<void> {
    const client = await this.client();
    if (!action.threadId) return;
    const ids = await client
      .api(`/me/messages?$filter=conversationId eq '${action.threadId}'&$select=id`)
      .get();
    const messageIds: string[] = (ids.value || []).map((m: { id: string }) => m.id);
    await Promise.all(
      messageIds.map(async (id) => {
        switch (action.kind) {
          case 'archive':
            return client.api(`/me/messages/${id}/move`).post({ destinationId: 'archive' });
          case 'delete':
            return client.api(`/me/messages/${id}`).delete();
          case 'markRead':
            return client.api(`/me/messages/${id}`).patch({ isRead: true });
          case 'markUnread':
            return client.api(`/me/messages/${id}`).patch({ isRead: false });
          case 'star':
            return client.api(`/me/messages/${id}`).patch({ flag: { flagStatus: 'flagged' } });
          case 'unstar':
            return client.api(`/me/messages/${id}`).patch({ flag: { flagStatus: 'notFlagged' } });
          case 'addLabel':
            return action.labelId && client.api(`/me/messages/${id}`).patch({ categories: [action.labelId] });
          case 'removeLabel':
            return client.api(`/me/messages/${id}`).patch({ categories: [] });
        }
      }),
    );
  }
}

// Token refresh is registered for completeness; the route layer also handles 401.
export async function refreshMicrosoftToken(accountId: string): Promise<void> {
  const tokens = await getTokens(accountId);
  if (!tokens?.refreshToken) return;
  const tenant = process.env.MICROSOFT_TENANT || 'common';
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    scope: 'https://graph.microsoft.com/.default offline_access',
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error('Microsoft refresh failed');
  const j = (await r.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  await setTokens(accountId, {
    accessToken: j.access_token,
    refreshToken: j.refresh_token || tokens.refreshToken,
    expiresAt: Date.now() + j.expires_in * 1000,
  });
}
