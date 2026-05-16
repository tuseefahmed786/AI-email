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
import { ImapFlow, type FetchMessageObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { getImapCreds } from '@/lib/auth/session';

interface ImapCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  smtpHost?: string;
  smtpPort?: number;
}

const WELL_KNOWN_FOLDERS: Record<string, string> = {
  inbox: 'INBOX',
  sent: 'Sent',
  archive: 'Archive',
  trash: 'Trash',
  spam: 'Spam',
};

function toAddr(a?: { name?: string; address?: string }): MailAddress {
  return { name: a?.name, email: a?.address || '' };
}

export class ImapProvider implements MailProvider {
  kind = 'imap' as const;
  account: MailAccount;

  constructor(account: MailAccount) {
    this.account = account;
  }

  private async creds(): Promise<ImapCreds> {
    const c = await getImapCreds(this.account.id);
    if (!c) throw new Error('IMAP credentials missing for ' + this.account.id);
    return c;
  }

  private async withClient<T>(fn: (c: ImapFlow) => Promise<T>): Promise<T> {
    const c = await this.creds();
    const client = new ImapFlow({
      host: c.host,
      port: c.port,
      secure: c.secure,
      auth: { user: c.user, pass: c.pass },
      logger: false,
    });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.logout();
    }
  }

  async listThreads({ labelId = 'INBOX', limit = 50, query }: ListOptions): Promise<ListResult> {
    return this.withClient(async (client) => {
      const folder = WELL_KNOWN_FOLDERS[labelId.toLowerCase()] || labelId;
      const lock = await client.getMailboxLock(folder);
      try {
        const searchCriteria = query
          ? ({ or: [{ subject: query }, { from: query }, { body: query }] } as never)
          : ({ all: true } as never);
        const found = await client.search(searchCriteria, { uid: true });
        const uids: number[] = Array.isArray(found) ? found : [];
        const recent = uids.slice(-limit).reverse();
        const threads = new Map<string, MailMessage[]>();
        for await (const m of client.fetch(recent, {
          envelope: true,
          internalDate: true,
          flags: true,
          bodyStructure: true,
        }, { uid: true })) {
          const env = (m as FetchMessageObject).envelope!;
          const tid = (env.inReplyTo || env.messageId || `single_${m.uid}`).replace(/[<>]/g, '');
          const msg: MailMessage = {
            id: String(m.uid),
            threadId: tid,
            accountId: this.account.id,
            from: toAddr(env.from?.[0]),
            to: (env.to || []).map(toAddr),
            cc: (env.cc || []).map(toAddr),
            subject: env.subject || '(no subject)',
            snippet: '',
            date: (env.date || new Date()).toISOString(),
            unread: !((m as FetchMessageObject).flags?.has('\\Seen')),
            starred: (m as FetchMessageObject).flags?.has('\\Flagged'),
            labels: [folder],
          };
          const arr = threads.get(tid) || [];
          arr.push(msg);
          threads.set(tid, arr);
        }
        const out: MailThread[] = [];
        for (const [tid, msgs] of threads) {
          const last = msgs[0];
          out.push({
            id: tid,
            accountId: this.account.id,
            subject: last.subject,
            participants: Array.from(new Map(msgs.flatMap((m) => [m.from, ...m.to]).map((p) => [p.email, p])).values()),
            snippet: last.snippet,
            date: last.date,
            unread: msgs.some((m) => m.unread),
            messageCount: msgs.length,
            labels: [folder],
          });
        }
        out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
        return { threads: out };
      } finally {
        lock.release();
      }
    });
  }

  async getThread(threadId: string): Promise<MailThread> {
    return this.withClient(async (client) => {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const messages: MailMessage[] = [];
        for await (const m of client.fetch('1:*', { envelope: true, source: true })) {
          const src = (m as FetchMessageObject).source;
          if (!src) continue;
          const parsed = await simpleParser(src as Buffer);
          const id = (parsed.messageId || '').replace(/[<>]/g, '');
          const refs = (parsed.references ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references]) : []) as string[];
          const inReply = (parsed.inReplyTo || '').replace(/[<>]/g, '');
          if (id === threadId || inReply === threadId || refs.some((r) => r.replace(/[<>]/g, '') === threadId)) {
            messages.push({
              id,
              threadId,
              accountId: this.account.id,
              from: toAddr({ name: parsed.from?.value[0].name, address: parsed.from?.value[0].address }),
              to: (parsed.to as { value?: { name?: string; address?: string }[] } | undefined)?.value?.map((v) => toAddr(v)) || [],
              cc: (parsed.cc as { value?: { name?: string; address?: string }[] } | undefined)?.value?.map((v) => toAddr(v)) || [],
              subject: parsed.subject || '(no subject)',
              snippet: (parsed.text || '').slice(0, 200),
              bodyHtml: typeof parsed.html === 'string' ? parsed.html : undefined,
              bodyText: parsed.text,
              date: parsed.date?.toISOString() || new Date().toISOString(),
              unread: false,
              labels: ['INBOX'],
            });
          }
        }
        messages.sort((a, b) => +new Date(a.date) - +new Date(b.date));
        const last = messages[messages.length - 1];
        return {
          id: threadId,
          accountId: this.account.id,
          subject: last?.subject || '(no subject)',
          participants: Array.from(new Map(messages.flatMap((m) => [m.from, ...m.to]).map((p) => [p.email, p])).values()),
          snippet: last?.snippet || '',
          date: last?.date || new Date().toISOString(),
          unread: messages.some((m) => m.unread),
          messageCount: messages.length,
          labels: ['INBOX'],
          messages,
        };
      } finally {
        lock.release();
      }
    });
  }

  async search(query: string, opts: ListOptions = {}): Promise<ListResult> {
    return this.listThreads({ ...opts, query });
  }

  async listLabels(): Promise<MailLabel[]> {
    return this.withClient(async (client) => {
      const list = await client.list();
      return list.map((m) => ({
        id: m.path,
        name: m.name,
        kind: m.specialUse ? 'system' : 'user',
      }));
    });
  }

  async send(msg: SendOptions): Promise<{ id: string; threadId: string }> {
    const c = await this.creds();
    const transport = nodemailer.createTransport({
      host: c.smtpHost || c.host.replace('imap', 'smtp'),
      port: c.smtpPort || 465,
      secure: true,
      auth: { user: c.user, pass: c.pass },
    });
    const info = await transport.sendMail({
      from: `${this.account.displayName} <${this.account.email}>`,
      to: msg.to.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', '),
      cc: msg.cc?.map((r) => r.email).join(', '),
      subject: msg.subject,
      text: msg.bodyText,
      html: msg.bodyHtml,
      inReplyTo: msg.inReplyToMessageId,
    });
    return { id: info.messageId, threadId: msg.threadId || info.messageId };
  }

  async applyAction(action: MailAction): Promise<void> {
    await this.withClient(async (client) => {
      const lock = await client.getMailboxLock('INBOX');
      try {
        if (!action.threadId) return;
        const uid = parseInt(action.threadId, 10);
        if (Number.isNaN(uid)) return;
        switch (action.kind) {
          case 'archive':
            await client.messageMove(uid, 'Archive', { uid: true });
            break;
          case 'delete':
            await client.messageMove(uid, 'Trash', { uid: true });
            break;
          case 'markRead':
            await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
            break;
          case 'markUnread':
            await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
            break;
          case 'star':
            await client.messageFlagsAdd(uid, ['\\Flagged'], { uid: true });
            break;
          case 'unstar':
            await client.messageFlagsRemove(uid, ['\\Flagged'], { uid: true });
            break;
        }
      } finally {
        lock.release();
      }
    });
  }
}
