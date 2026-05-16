'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { Icons } from './Icon';

export function ComposeSheet() {
  const { composing, composeContext, closeCompose, accounts, activeAccountId } = useApp();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!composing) return;
    const account = accounts.find((a) => a.id === activeAccountId) || composeContext?.thread?.accountId
      ? accounts.find((a) => a.id === composeContext?.thread?.accountId)
      : accounts[0];
    setFrom(account?.id || accounts[0]?.id || '');
    const reply = composeContext?.thread;
    if (reply) {
      const last = reply.messages?.[reply.messages.length - 1];
      setTo((last?.from?.email && reply.subject?.startsWith('Re:') === false) ? last.from.email : last?.from?.email || '');
      setSubject(composeContext?.subject || `Re: ${reply.subject}`);
    } else {
      setTo('');
      setSubject(composeContext?.subject || '');
    }
    const w = window as unknown as { __prefillDraft?: string };
    setBody(w.__prefillDraft || '');
    w.__prefillDraft = undefined;
  }, [composing, composeContext, accounts, activeAccountId]);

  if (!composing) return null;

  async function send() {
    setSending(true);
    try {
      const recipients = to.split(',').map((s) => s.trim()).filter(Boolean).map((email) => ({ email }));
      const r = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: from,
          to: recipients,
          subject,
          bodyText: body,
          threadId: composeContext?.thread?.id,
        }),
      });
      if (!r.ok) throw new Error('send failed');
      closeCompose();
    } catch (e) {
      console.error(e);
      alert('Send failed. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/30 flex items-end md:items-center justify-center" onClick={closeCompose}>
      <div
        className="bg-surface w-full md:max-w-2xl md:rounded-xl2 rounded-t-xl2 border border-border shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="font-medium">{composeContext?.thread ? 'Reply' : 'New message'}</span>
          <button className="ml-auto btn-ghost" onClick={closeCompose} aria-label="Close">
            <Icons.X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-4 space-y-2 overflow-y-auto">
          <div className="flex items-center gap-2">
            <label className="w-12 text-xs text-muted">From</label>
            <select className="input flex-1" value={from} onChange={(e) => setFrom(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.displayName} ({a.email})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-12 text-xs text-muted">To</label>
            <input className="input flex-1" placeholder="comma-separated" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-12 text-xs text-muted">Subject</label>
            <input className="input flex-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <textarea
            className="input min-h-[260px] resize-y font-sans leading-relaxed"
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <footer className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <button onClick={send} disabled={sending || !to || !body} className="btn-primary disabled:opacity-50">
            {sending ? <Icons.Spinner className="w-4 h-4 animate-spin" /> : <Icons.Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send'}
          </button>
          <span className="text-xs text-muted ml-auto">Plain text · attachments coming soon</span>
        </footer>
      </div>
    </div>
  );
}
