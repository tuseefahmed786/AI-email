'use client';

import { useState } from 'react';
import { useApp } from '@/state/store';
import { Icons } from './Icon';
import { cn } from '@/lib/utils';
import type { AIDraft, MailThread } from '@/types/mail';

const TONES: AIDraft['tone'][] = ['concise', 'friendly', 'formal'];

export function AIReplyDrafts({ thread }: { thread: MailThread }) {
  const { openCompose } = useApp();
  const [tone, setTone] = useState<AIDraft['tone']>('friendly');
  const [draft, setDraft] = useState<AIDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function generate(t: AIDraft['tone']) {
    setTone(t);
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, accountId: thread.accountId, tone: t, instruction: instruction || undefined }),
      });
      const j = (await r.json()) as { draft?: AIDraft; error?: unknown };
      if (j.draft) setDraft(j.draft);
      else setError('Could not draft a reply.');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function useDraft() {
    if (!draft) return;
    openCompose({ thread, subject: `Re: ${thread.subject}` });
    // Slight hack: prefill via global so ComposeSheet picks it up.
    (window as unknown as { __prefillDraft?: string }).__prefillDraft = draft.bodyText;
  }

  return (
    <div className="card p-3 bg-surface2/40">
      <div className="flex items-center gap-2 mb-2">
        <Icons.Sparkles className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium">AI reply</span>
        <div className="ml-auto flex gap-1">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => generate(t)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border',
                tone === t && draft ? 'border-brand text-brand bg-brand/5' : 'border-border text-muted hover:bg-surface',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <input
        className="input text-xs mb-2"
        placeholder='Optional direction, e.g. "decline politely; suggest Tuesday"'
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      {loading && (
        <div className="text-sm text-muted flex items-center gap-2">
          <Icons.Spinner className="w-4 h-4 animate-spin" /> Drafting a {tone} reply…
        </div>
      )}
      {error && <div className="text-sm text-danger">{error}</div>}
      {draft && !loading && (
        <>
          <pre className="text-sm whitespace-pre-wrap font-sans text-text/90">{draft.bodyText}</pre>
          {draft.rationale && (
            <p className="text-xs text-muted mt-2 italic">why: {draft.rationale}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button className="btn-primary text-xs" onClick={useDraft}>
              <Icons.Reply className="w-3.5 h-3.5" /> Use this draft
            </button>
            <button className="btn-ghost text-xs" onClick={() => generate(tone)}>
              <Icons.Refresh className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>
        </>
      )}
      {!draft && !loading && !error && (
        <button className="btn-ghost text-sm w-full justify-center" onClick={() => generate(tone)}>
          Draft a {tone} reply with Claude
        </button>
      )}
    </div>
  );
}
