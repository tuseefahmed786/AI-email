// Thin KV abstraction. Uses Upstash Redis in prod (set UPSTASH_* env vars on
// Vercel via the Marketplace integration) and an in-memory map in dev/tests.
// The in-memory map is intentionally per-process — fine for local dev, never
// for prod with multiple lambdas.

let upstash: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<unknown>; del: (k: string) => Promise<unknown> } | null = null;

async function getUpstash() {
  if (upstash) return upstash;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  const { Redis } = await import('@upstash/redis');
  const r = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  upstash = {
    get: async (k) => (await r.get<string>(k)) as string | null,
    set: async (k, v) => r.set(k, v),
    del: async (k) => r.del(k),
  };
  return upstash;
}

const mem = new Map<string, string>();

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const u = await getUpstash();
  const raw = u ? await u.get(key) : mem.get(key) ?? null;
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const u = await getUpstash();
  if (u) await u.set(key, raw);
  else mem.set(key, raw);
}

export async function kvDel(key: string): Promise<void> {
  const u = await getUpstash();
  if (u) await u.del(key);
  else mem.delete(key);
}
