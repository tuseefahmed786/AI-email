'use client';

import { avatarColor, initials } from '@/lib/utils';

export function Avatar({ name, email, size = 36 }: { name?: string; email: string; size?: number }) {
  const label = name || email || '?';
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        background: avatarColor(email || label),
        fontSize: Math.round(size * 0.4),
      }}
      className="flex items-center justify-center rounded-full text-white font-semibold shrink-0"
    >
      {initials(label)}
    </div>
  );
}
