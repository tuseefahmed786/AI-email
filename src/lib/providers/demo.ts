import type {
  MailAccount,
  MailAction,
  MailLabel,
  MailProvider,
  MailThread,
  ListOptions,
  ListResult,
  SendOptions,
} from '@/types/mail';
import { demoThreads } from './fixtures';

// Fixture-backed provider used in DEMO_MODE and tests. Mutations are kept in
// process memory so the UI can be exercised end-to-end without external APIs.
export class DemoProvider implements MailProvider {
  kind = 'gmail' as const;
  account: MailAccount;
  private threads: MailThread[];
  private labels: MailLabel[] = [
    { id: 'INBOX', name: 'Inbox', kind: 'system' },
    { id: 'STARRED', name: 'Starred', kind: 'system' },
    { id: 'SENT', name: 'Sent', kind: 'system' },
    { id: 'ARCHIVE', name: 'Archive', kind: 'system' },
    { id: 'TRASH', name: 'Trash', kind: 'system' },
    { id: 'work', name: 'Work', kind: 'user' },
    { id: 'personal', name: 'Personal', kind: 'user' },
  ];

  constructor(account: MailAccount) {
    this.account = account;
    this.threads = demoThreads(account.id);
  }

  async listThreads(opts: ListOptions): Promise<ListResult> {
    const { labelId = 'INBOX', limit = 50, query } = opts;
    let out = this.threads.filter((t) => t.labels.includes(labelId));
    if (query) {
      const q = query.toLowerCase();
      out = out.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q) ||
          t.participants.some((p) => (p.name || p.email).toLowerCase().includes(q)),
      );
    }
    out = [...out].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return { threads: out.slice(0, limit) };
  }

  async getThread(threadId: string): Promise<MailThread> {
    const t = this.threads.find((x) => x.id === threadId);
    if (!t) throw new Error(`thread not found: ${threadId}`);
    return t;
  }

  async search(query: string, opts: ListOptions = {}): Promise<ListResult> {
    return this.listThreads({ ...opts, query, labelId: opts.labelId ?? 'INBOX' });
  }

  async listLabels(): Promise<MailLabel[]> {
    return this.labels.map((l) => ({
      ...l,
      unread: this.threads.filter((t) => t.labels.includes(l.id) && t.unread).length,
    }));
  }

  async send(msg: SendOptions): Promise<{ id: string; threadId: string }> {
    const id = `m_${Date.now()}`;
    const threadId = msg.threadId || `t_${Date.now()}`;
    const date = new Date().toISOString();
    const newMsg = {
      id,
      threadId,
      accountId: this.account.id,
      from: { email: this.account.email, name: this.account.displayName },
      to: msg.to,
      cc: msg.cc,
      subject: msg.subject,
      snippet: msg.bodyText.slice(0, 140),
      bodyHtml: msg.bodyHtml,
      bodyText: msg.bodyText,
      date,
      unread: false,
      labels: ['SENT'],
    };
    if (msg.threadId) {
      const existing = this.threads.find((t) => t.id === msg.threadId);
      if (existing) {
        existing.messages = [...(existing.messages || []), newMsg];
        existing.messageCount = (existing.messageCount || 0) + 1;
        existing.snippet = newMsg.snippet;
        existing.date = date;
      }
    } else {
      this.threads.unshift({
        id: threadId,
        accountId: this.account.id,
        subject: msg.subject,
        participants: [newMsg.from, ...msg.to],
        snippet: newMsg.snippet,
        date,
        unread: false,
        messageCount: 1,
        labels: ['SENT'],
        messages: [newMsg],
      });
    }
    return { id, threadId };
  }

  async applyAction(action: MailAction): Promise<void> {
    const t = this.threads.find((x) => x.id === action.threadId);
    if (!t) return;
    switch (action.kind) {
      case 'archive':
        t.labels = t.labels.filter((l) => l !== 'INBOX').concat('ARCHIVE');
        break;
      case 'delete':
        t.labels = ['TRASH'];
        break;
      case 'markRead':
        t.unread = false;
        t.messages?.forEach((m) => (m.unread = false));
        break;
      case 'markUnread':
        t.unread = true;
        break;
      case 'star':
        t.labels = Array.from(new Set([...t.labels, 'STARRED']));
        break;
      case 'unstar':
        t.labels = t.labels.filter((l) => l !== 'STARRED');
        break;
      case 'addLabel':
        if (action.labelId) t.labels = Array.from(new Set([...t.labels, action.labelId]));
        break;
      case 'removeLabel':
        if (action.labelId) t.labels = t.labels.filter((l) => l !== action.labelId);
        break;
    }
  }
}
