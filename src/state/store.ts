'use client';

import { create } from 'zustand';
import type { MailAccount, MailThread, AIPriority, AISummary } from '@/types/mail';

interface AppState {
  accounts: MailAccount[];
  activeAccountId: string | null; // null = unified
  threads: MailThread[];
  selectedThreadId: string | null;
  label: string;
  query: string;
  loading: boolean;
  composing: boolean;
  composeContext?: { thread?: MailThread; subject?: string; to?: { email: string; name?: string }[] };
  priorities: Record<string, AIPriority>;
  summaries: Record<string, AISummary>;
  setAccounts: (a: MailAccount[]) => void;
  setActiveAccount: (id: string | null) => void;
  setThreads: (t: MailThread[]) => void;
  setLoading: (l: boolean) => void;
  setLabel: (l: string) => void;
  setQuery: (q: string) => void;
  selectThread: (id: string | null) => void;
  openCompose: (ctx?: AppState['composeContext']) => void;
  closeCompose: () => void;
  setPriorities: (p: AIPriority[]) => void;
  setSummary: (s: AISummary) => void;
  applyOptimisticAction: (threadId: string, kind: 'archive' | 'delete' | 'markRead' | 'markUnread' | 'star' | 'unstar') => void;
}

export const useApp = create<AppState>((set) => ({
  accounts: [],
  activeAccountId: null,
  threads: [],
  selectedThreadId: null,
  label: 'INBOX',
  query: '',
  loading: false,
  composing: false,
  priorities: {},
  summaries: {},
  setAccounts: (accounts) => set({ accounts }),
  setActiveAccount: (activeAccountId) => set({ activeAccountId }),
  setThreads: (threads) => set({ threads }),
  setLoading: (loading) => set({ loading }),
  setLabel: (label) => set({ label }),
  setQuery: (query) => set({ query }),
  selectThread: (selectedThreadId) => set({ selectedThreadId }),
  openCompose: (composeContext) => set({ composing: true, composeContext }),
  closeCompose: () => set({ composing: false, composeContext: undefined }),
  setPriorities: (arr) =>
    set((s) => ({
      priorities: { ...s.priorities, ...Object.fromEntries(arr.map((p) => [p.threadId, p])) },
    })),
  setSummary: (sm) => set((s) => ({ summaries: { ...s.summaries, [sm.threadId]: sm } })),
  applyOptimisticAction: (threadId, kind) =>
    set((s) => {
      let threads = s.threads;
      if (kind === 'archive' || kind === 'delete') {
        threads = threads.filter((t) => t.id !== threadId);
      } else {
        threads = threads.map((t) =>
          t.id !== threadId
            ? t
            : {
                ...t,
                unread: kind === 'markUnread' ? true : kind === 'markRead' ? false : t.unread,
                labels:
                  kind === 'star'
                    ? Array.from(new Set([...t.labels, 'STARRED']))
                    : kind === 'unstar'
                      ? t.labels.filter((l) => l !== 'STARRED')
                      : t.labels,
              },
        );
      }
      return { threads, selectedThreadId: kind === 'archive' || kind === 'delete' ? null : s.selectedThreadId };
    }),
}));
