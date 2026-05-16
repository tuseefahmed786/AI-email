'use client';

import { useApp } from '@/state/store';
import { Avatar } from './Avatar';
import { PriorityBadge } from './PriorityBadge';
import { cn, timeAgo } from '@/lib/utils';
import { Icons } from './Icon';

export function InboxList() {
  const { threads, selectedThreadId, selectThread, loading, priorities, accounts, activeAccountId, label, query } = useApp();

  if (loading && threads.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="flex-1">
              <div className="skeleton h-3 w-1/3 mb-2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-8 text-center text-muted">
        <Icons.Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">
          {query ? `No matches for "${query}"` : `No mail in ${label.toLowerCase()}`}
        </p>
      </div>
    );
  }

  // Sort: urgent > important > normal > low, then by date.
  const order: Record<string, number> = { urgent: 0, important: 1, normal: 2, low: 3 };
  const sorted = [...threads].sort((a, b) => {
    const pa = priorities[a.id]?.bucket;
    const pb = priorities[b.id]?.bucket;
    if (pa && pb && pa !== pb) return order[pa] - order[pb];
    return +new Date(b.date) - +new Date(a.date);
  });

  return (
    <ul className="flex flex-col">
      {sorted.map((t) => {
        const last = t.messages?.[t.messages.length - 1];
        const sender = last?.from || t.participants[0] || { email: 'unknown' };
        const account = accounts.find((a) => a.id === t.accountId);
        const prio = priorities[t.id];
        return (
          <li key={t.id}>
            <button
              onClick={() => selectThread(t.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-3 text-left border-b border-border/60 transition-colors',
                selectedThreadId === t.id ? 'bg-brand/5' : 'hover:bg-surface2',
              )}
            >
              <div className="relative">
                <Avatar email={sender.email} name={sender.name} size={40} />
                {!activeAccountId && account && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface"
                    style={{ background: account.color || '#888' }}
                    title={account.email}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('truncate text-sm', t.unread ? 'font-semibold' : 'text-text/90')}>
                    {sender.name || sender.email}
                  </span>
                  {t.messageCount > 1 && (
                    <span className="text-[10px] text-muted">· {t.messageCount}</span>
                  )}
                  <span className="ml-auto text-[11px] text-muted shrink-0">{timeAgo(t.date)}</span>
                </div>
                <div className={cn('text-sm truncate', t.unread ? 'font-medium' : 'text-text/80')}>
                  {t.subject || '(no subject)'}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xs text-muted truncate flex-1">{t.snippet}</span>
                  <PriorityBadge priority={prio} compact />
                  {t.labels.includes('STARRED') && <Icons.Star className="w-3.5 h-3.5 text-warn" />}
                  {t.unread && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
