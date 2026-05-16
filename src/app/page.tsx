'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/state/store';
import { Sidebar } from '@/components/Sidebar';
import { InboxList } from '@/components/InboxList';
import { ThreadView } from '@/components/ThreadView';
import { ComposeSheet } from '@/components/ComposeSheet';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { SearchBar } from '@/components/SearchBar';
import { Icons } from '@/components/Icon';
import type { MailAccount, MailThread, AIPriority } from '@/types/mail';

export default function InboxPage() {
  const {
    accounts, activeAccountId, label, query, threads, selectedThreadId,
    setAccounts, setActiveAccount, setThreads, setLoading, setPriorities,
  } = useApp();
  const [drawer, setDrawer] = useState(false);

  // Load accounts on mount.
  useEffect(() => {
    fetch('/api/mail/accounts')
      .then((r) => r.json())
      .then((j: { accounts: MailAccount[]; activeAccountId: string | null }) => {
        setAccounts(j.accounts);
        // null = unified by default
      })
      .catch(() => {});
  }, [setAccounts, setActiveAccount]);

  // Load threads when label/account/query changes (debounce search).
  useEffect(() => {
    if (accounts.length === 0) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      const url = query.trim()
        ? `/api/mail/search?q=${encodeURIComponent(query)}`
        : `/api/mail/list?label=${encodeURIComponent(label)}${activeAccountId ? `&accountId=${activeAccountId}` : ''}`;
      fetch(url)
        .then((r) => r.json())
        .then((j: { threads: MailThread[] }) => {
          if (cancelled) return;
          setThreads(j.threads || []);
        })
        .catch(() => !cancelled && setThreads([]))
        .finally(() => !cancelled && setLoading(false));
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [label, activeAccountId, query, accounts.length, setThreads, setLoading]);

  // Background AI prioritization for visible threads.
  useEffect(() => {
    if (threads.length === 0 || label !== 'INBOX' || query) return;
    const ids = threads.slice(0, 20).map((t) => t.id);
    fetch('/api/ai/prioritize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadIds: ids, label: 'INBOX' }),
    })
      .then((r) => r.json())
      .then((j: { priorities: AIPriority[] }) => j.priorities && setPriorities(j.priorities))
      .catch(() => {});
  }, [threads, label, query, setPriorities]);

  const showThreadOnMobile = !!selectedThreadId;

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="h-[100svh] w-full flex bg-bg text-text">
      {/* Sidebar — drawer on mobile */}
      <aside className="hidden md:block w-56 border-r border-border">
        <Sidebar />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-y-0 left-0 w-64 bg-surface border-r border-border" onClick={(e) => e.stopPropagation()}>
            <Sidebar onPick={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Inbox list */}
      <section className={`${showThreadOnMobile ? 'hidden md:flex' : 'flex'} flex-col flex-1 md:max-w-md border-r border-border`}>
        <header className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button className="btn-ghost md:hidden -ml-1" onClick={() => setDrawer(true)} aria-label="Menu">
            <Icons.Inbox className="w-5 h-5" />
          </button>
          <AccountSwitcher />
          <SearchBar />
        </header>
        <div className="flex-1 overflow-y-auto">
          <InboxList />
        </div>
      </section>

      {/* Thread pane */}
      <section className={`${showThreadOnMobile ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
        <ThreadView />
      </section>

      <ComposeSheet />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="flex items-center gap-2 mb-3">
        <Icons.Sparkles className="w-6 h-6 text-brand" />
        <h1 className="text-2xl font-semibold">Universal Mail</h1>
      </div>
      <p className="text-muted max-w-md mb-6">
        One inbox across Gmail, Office 365, and IMAP — with Claude-powered summaries, reply drafts, and priority sorting.
      </p>
      <div className="card p-4 w-full max-w-sm flex flex-col gap-2">
        <a href="/api/auth/gmail" className="btn-primary w-full">
          <Icons.Mail className="w-4 h-4" /> Connect Gmail
        </a>
        <a href="/api/auth/microsoft" className="btn-ghost w-full border border-border">
          <Icons.Mail className="w-4 h-4" /> Connect Outlook / Office 365
        </a>
        <a href="/settings#imap" className="btn-ghost w-full border border-border">
          <Icons.Mail className="w-4 h-4" /> Connect Yahoo / AOL / IMAP
        </a>
      </div>
      <p className="text-xs text-muted mt-6">
        Or run in demo mode: set <code className="bg-surface2 px-1.5 py-0.5 rounded">DEMO_MODE=1</code> in your env.
      </p>
    </div>
  );
}
