'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { Icons } from './Icon';
import type { AISummary, MailThread } from '@/types/mail';

export function AISummaryCard({ thread }: { thread: MailThread }) {
  const { summaries, setSummary } = useApp();
  const cached = summaries[thread.id];
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, accountId: thread.accountId }),
    })
      .then((r) => r.json())
      .then((j: { summary?: AISummary; error?: unknown }) => {
        if (cancelled) return;
        if (j.summary) setSummary(j.summary);
        else setError('Could not summarize this thread.');
      })
      .catch(() => !cancelled && setError('Network error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [thread.id, thread.accountId, cached, setSummary]);

  if (loading) {
    return (
      <div className="card p-3 flex items-start gap-2.5">
        <Icons.Sparkles className="w-4 h-4 text-brand mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="skeleton h-3 w-4/5 mb-2" />
          <div className="skeleton h-3 w-3/5" />
        </div>
      </div>
    );
  }
  const s = cached;
  if (!s) {
    return (
      <div className="card p-3 text-sm text-muted flex items-center gap-2">
        <Icons.Sparkles className="w-4 h-4" /> {error || 'No summary available'}
      </div>
    );
  }
  return (
    <div className="card p-3 bg-brand/5 border-brand/20">
      <div className="flex items-start gap-2.5">
        <Icons.Sparkles className="w-4 h-4 text-brand mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium leading-snug">{s.oneLine}</p>
          {s.bullets.length > 0 && (
            <ul className="text-sm text-text/90 space-y-1 pl-1">
              {s.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.actionItems.length > 0 && (
            <div className="pt-1 border-t border-brand/20">
              <div className="text-[11px] uppercase tracking-wide text-brand font-semibold mb-1">You need to</div>
              <ul className="text-sm space-y-1">
                {s.actionItems.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <Icons.Check className="w-3.5 h-3.5 mt-0.5 text-brand" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
