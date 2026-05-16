import { describe, it, expect, beforeEach } from 'vitest';
import { DemoProvider } from '@/lib/providers/demo';
import type { MailAccount } from '@/types/mail';

const account: MailAccount = {
  id: 'demo',
  provider: 'gmail',
  email: 'demo@example.com',
  displayName: 'Demo',
};

describe('DemoProvider', () => {
  let p: DemoProvider;
  beforeEach(() => {
    p = new DemoProvider(account);
  });

  it('lists threads in the inbox by default', async () => {
    const { threads } = await p.listThreads({});
    expect(threads.length).toBeGreaterThan(3);
    expect(threads.every((t) => t.labels.includes('INBOX'))).toBe(true);
  });

  it('sorts most recent first', async () => {
    const { threads } = await p.listThreads({});
    for (let i = 1; i < threads.length; i++) {
      expect(+new Date(threads[i - 1].date)).toBeGreaterThanOrEqual(+new Date(threads[i].date));
    }
  });

  it('search filters by subject, snippet, and participant', async () => {
    const acme = await p.search('ACME');
    expect(acme.threads.length).toBe(1);
    expect(acme.threads[0].id).toBe('t_acme_renewal');

    const mom = await p.search('mom');
    expect(mom.threads[0].id).toBe('t_mom');
  });

  it('archive removes the thread from INBOX', async () => {
    await p.applyAction({ kind: 'archive', threadId: 't_newsletter' });
    const { threads } = await p.listThreads({ labelId: 'INBOX' });
    expect(threads.find((t) => t.id === 't_newsletter')).toBeUndefined();
  });

  it('star adds the STARRED label', async () => {
    await p.applyAction({ kind: 'star', threadId: 't_mom' });
    const t = await p.getThread('t_mom');
    expect(t.labels).toContain('STARRED');
  });

  it('markRead clears unread on the thread', async () => {
    await p.applyAction({ kind: 'markRead', threadId: 't_acme_renewal' });
    const t = await p.getThread('t_acme_renewal');
    expect(t.unread).toBe(false);
  });

  it('send into existing thread appends a message', async () => {
    const before = await p.getThread('t_mom');
    const beforeCount = before.messages?.length || 0;
    await p.send({
      threadId: 't_mom',
      to: [{ email: 'mom@family.example' }],
      subject: 'Re: dinner Sunday?',
      bodyText: 'See you at 6.',
    });
    const after = await p.getThread('t_mom');
    expect(after.messages?.length).toBe(beforeCount + 1);
  });

  it('send without threadId creates a new conversation', async () => {
    const { threadId } = await p.send({
      to: [{ email: 'new@example.com' }],
      subject: 'Hello',
      bodyText: 'First time writing.',
    });
    const sent = await p.getThread(threadId);
    expect(sent.subject).toBe('Hello');
    expect(sent.labels).toContain('SENT');
  });

  it('listLabels reports unread counts', async () => {
    const labels = await p.listLabels();
    const inbox = labels.find((l) => l.id === 'INBOX');
    expect(inbox).toBeDefined();
    expect(inbox!.unread).toBeGreaterThan(0);
  });
});
