'use client';

import { useApp } from '@/state/store';
import { Icons } from './Icon';

export function SearchBar() {
  const { query, setQuery } = useApp();
  return (
    <div className="relative flex-1">
      <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
      <input
        className="input pl-9 pr-3 rounded-full bg-surface2 border-transparent focus:bg-surface focus:border-border"
        placeholder="Search across all mailboxes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
