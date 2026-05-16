'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useApp } from '@/state/store';
import { Avatar } from './Avatar';
import { Icons } from './Icon';
import { AISummaryCard } from './AISummary';
import { AIReplyDrafts } from './AIReplyDrafts';
import { cn, timeAgo } from '@/lib/utils';
import type { MailThread } from '@/types/mail';

export function ThreadView() {
  const { selectedThreadId, threads, selectThread, openCompose, applyOptimisticAction } = useApp();
  const summary = threads.find((t) => t.id === selectedThreadId);
  const [full, setFull] = useState<MailThread | null>(null);

  useEffect(() => {
    if (!selectedThreadId || !summary) return setFull(null);
    setFull(null);
    fetch(`/api/mail/thread/${encodeURIComponent(selectedThreadId)}?accountId=${encodeURIComponent(summary.accountId)}`)
      .then((r) => r.json())
      .then((j) => setFull(j.thread || null))
      .catch(() => setFull(null));
  }, [selectedThreadId, summary]);

  if (!selectedThreadId || !summary) {
    return (
      <div className="hidden md:flex h-full items-center justify-center text-muted">
        <div className="text-center">
          <Icons.Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Select a thread</p>
        </div>
      </div>
    );
  }

  const t = full || summary;

  async function act(kind: 'archive' | 'delete' | 'star' | 'unstar' | 'markUnread') {
    applyOptimisticAction(selectedThreadId!, kind);
    await fetch('/api/mail/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: t.accountId, action: { kind, threadId: selectedThreadId } }),
    });
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      <header className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <button onClick={() => selectThread(null)} className="btn-ghost md:hidden -ml-1" aria-label="Back">
          <Icons.Back className="w-5 h-5" />
        </button>
        <h2 className="font-semibold truncate flex-1">{t.subject || '(no subject)'}</h2>
        <button onClick={() => act('star')} className="btn-ghost" aria-label="Star">
          <Icons.Star className={cn('w-4 h-4', t.labels.includes('STARRED') && 'fill-warn text-warn')} />
        </button>
        <button onClick={() => act('archive')} className="btn-ghost" aria-label="Archive">
          <Icons.Archive className="w-4 h-4" />
        </button>
        <button onClick={() => act('delete')} className="btn-ghost" aria-label="Delete">
          <Icons.Trash2 className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AISummaryCard thread={t} />
        {(t.messages || []).map((m) => (
          <article key={m.id} className="card p-3">
            <header className="flex items-start gap-3 mb-2">
              <Avatar email={m.from.email} name={m.from.name} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-x-2 items-baseline">
                  <span className="font-medium">{m.from.name || m.from.email}</span>
                  <span className="text-xs text-muted truncate">&lt;{m.from.email}&gt;</span>
                </div>
                <div className="text-xs text-muted">
                  to {m.to.map((x) => x.name || x.email).join(', ')}
                  <span className="mx-1.5">·</span>
                  {timeAgo(m.date)}
                </div>
              </div>
            </header>
            {m.bodyHtml ? (
              <div
                className="email-html"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(m.bodyHtml, { FORBID_TAGS: ['style', 'script'], FORBID_ATTR: ['onclick', 'onerror', 'onload'] }),
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-sans">{m.bodyText || m.snippet}</pre>
            )}
          </article>
        ))}
        <AIReplyDrafts thread={t} />
      </div>

      <footer className="border-t border-border p-3 flex gap-2">
        <button onClick={() => openCompose({ thread: t, subject: `Re: ${t.subject}` })} className="btn-primary flex-1">
          <Icons.Reply className="w-4 h-4" /> Reply
        </button>
        <button onClick={() => openCompose({ thread: t, subject: `Fwd: ${t.subject}` })} className="btn-ghost">
          <Icons.Forward className="w-4 h-4" /> Forward
        </button>
      </footer>
    </div>
  );
}
