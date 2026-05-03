const cache = new Map<string, { expires: number; value: any }>();

export async function cachedFetchJson<T>(key: string, fetcher: () => Promise<T>, ttlMs = 10 * 60 * 1000) {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return cached.value as T;
  const value = await fetcher();
  cache.set(key, { expires: now + ttlMs, value });
  return value;
}
