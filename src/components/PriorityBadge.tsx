'use client';

import { cn } from '@/lib/utils';
import { Icons } from './Icon';
import type { AIPriority } from '@/types/mail';

const META: Record<AIPriority['bucket'], { color: string; bg: string; ring: string; Icon: typeof Icons.Flame; label: string }> = {
  urgent:    { color: 'text-danger', bg: 'bg-danger/10', ring: 'ring-danger/30', Icon: Icons.Flame, label: 'Urgent' },
  important: { color: 'text-warn',   bg: 'bg-warn/10',   ring: 'ring-warn/30',   Icon: Icons.Alert,  label: 'Important' },
  normal:    { color: 'text-muted',  bg: 'bg-surface2',  ring: 'ring-border',    Icon: Icons.Dot,    label: 'Normal' },
  low:       { color: 'text-muted',  bg: 'bg-surface2',  ring: 'ring-border',    Icon: Icons.Minus,  label: 'Low' },
};

export function PriorityBadge({ priority, compact = false }: { priority?: AIPriority; compact?: boolean }) {
  if (!priority) return null;
  const m = META[priority.bucket];
  if (compact) {
    return (
      <span title={priority.reason} className={cn('inline-flex items-center justify-center rounded-full ring-1', m.bg, m.ring)} style={{ width: 18, height: 18 }}>
        <m.Icon className={cn('w-3 h-3', m.color)} />
      </span>
    );
  }
  return (
    <span className={cn('chip ring-1', m.bg, m.color, m.ring)} title={priority.reason}>
      <m.Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}
