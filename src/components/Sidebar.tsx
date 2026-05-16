'use client';

import { useApp } from '@/state/store';
import { Icons } from './Icon';
import { cn } from '@/lib/utils';

const LABELS: { id: string; name: string; Icon: typeof Icons.Inbox }[] = [
  { id: 'INBOX', name: 'Inbox', Icon: Icons.Inbox },
  { id: 'STARRED', name: 'Starred', Icon: Icons.Star },
  { id: 'SENT', name: 'Sent', Icon: Icons.Send },
  { id: 'ARCHIVE', name: 'Archive', Icon: Icons.Archive },
  { id: 'TRASH', name: 'Trash', Icon: Icons.Trash2 },
];

export function Sidebar({ onPick }: { onPick?: () => void }) {
  const { label, setLabel, openCompose } = useApp();
  return (
    <aside className="h-full flex flex-col p-3 gap-1">
      <button onClick={() => openCompose()} className="btn-primary mb-3 w-full">
        <Icons.Plus className="w-4 h-4" /> Compose
      </button>
      {LABELS.map((l) => (
        <button
          key={l.id}
          onClick={() => { setLabel(l.id); onPick?.(); }}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors',
            label === l.id ? 'bg-brand/10 text-brand font-medium' : 'text-text hover:bg-surface2',
          )}
        >
          <l.Icon className="w-4 h-4" /> {l.name}
        </button>
      ))}
      <div className="mt-auto pt-3 border-t border-border">
        <a href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-full text-sm text-muted hover:bg-surface2">
          <Icons.Settings className="w-4 h-4" /> Settings
        </a>
      </div>
    </aside>
  );
}
