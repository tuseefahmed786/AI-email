'use client';

import { useState } from 'react';
import { useApp } from '@/state/store';
import { Avatar } from './Avatar';
import { Icons } from './Icon';
import { cn } from '@/lib/utils';

export function AccountSwitcher() {
  const { accounts, activeAccountId, setActiveAccount } = useApp();
  const [open, setOpen] = useState(false);
  const active = accounts.find((a) => a.id === activeAccountId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-surface2 px-2 py-1.5 text-sm hover:bg-border/40"
        aria-label="Switch account"
      >
        {active ? (
          <>
            <Avatar email={active.email} name={active.displayName} size={24} />
            <span className="hidden sm:inline max-w-[160px] truncate">{active.email}</span>
          </>
        ) : (
          <>
            <div className="flex -space-x-2">
              {accounts.slice(0, 3).map((a) => (
                <Avatar key={a.id} email={a.email} name={a.displayName} size={22} />
              ))}
            </div>
            <span className="hidden sm:inline">All inboxes</span>
          </>
        )}
        <Icons.Down className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 card shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => { setActiveAccount(null); setOpen(false); }}
              className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface2', !activeAccountId && 'bg-surface2')}
            >
              <div className="flex -space-x-2">
                {accounts.slice(0, 3).map((a) => (
                  <Avatar key={a.id} email={a.email} name={a.displayName} size={28} />
                ))}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">All inboxes</div>
                <div className="text-xs text-muted">{accounts.length} accounts</div>
              </div>
              {!activeAccountId && <Icons.Check className="w-4 h-4 text-brand" />}
            </button>
            <div className="h-px bg-border" />
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => { setActiveAccount(a.id); setOpen(false); }}
                className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface2', activeAccountId === a.id && 'bg-surface2')}
              >
                <Avatar email={a.email} name={a.displayName} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.displayName}</div>
                  <div className="text-xs text-muted truncate">{a.email}</div>
                </div>
                <span className="chip text-[10px]">{a.provider}</span>
                {activeAccountId === a.id && <Icons.Check className="w-4 h-4 text-brand" />}
              </button>
            ))}
            <div className="h-px bg-border" />
            <a href="/settings" className="block px-3 py-2.5 text-sm text-muted hover:bg-surface2">
              <Icons.Plus className="inline w-4 h-4 mr-1.5 -mt-0.5" /> Add account
            </a>
          </div>
        </>
      )}
    </div>
  );
}
