import { describe, it, expect } from 'vitest';
import { timeAgo, initials, avatarColor } from '@/lib/utils';

describe('timeAgo', () => {
  it('returns seconds for < 1 minute', () => {
    const d = new Date(Date.now() - 30_000).toISOString();
    expect(timeAgo(d)).toMatch(/^\d+s$/);
  });
  it('returns minutes for < 1 hour', () => {
    const d = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(d)).toMatch(/^\d+m$/);
  });
  it('returns hours for < 1 day', () => {
    const d = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(timeAgo(d)).toMatch(/^\d+h$/);
  });
  it('returns days for < 1 week', () => {
    const d = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    expect(timeAgo(d)).toMatch(/^\d+d$/);
  });
});

describe('initials', () => {
  it('uses first letter of first two words', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
  });
  it('falls back to one letter', () => {
    expect(initials('Ada')).toBe('A');
  });
  it('uppercases', () => {
    expect(initials('grace hopper')).toBe('GH');
  });
});

describe('avatarColor', () => {
  it('is deterministic per seed', () => {
    expect(avatarColor('a@b.com')).toBe(avatarColor('a@b.com'));
  });
  it('differs across seeds', () => {
    expect(avatarColor('a@b.com')).not.toBe(avatarColor('z@y.com'));
  });
});
