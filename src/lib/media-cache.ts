/**
 * In-memory cache for the media catalog.
 *
 * The catalog scan is expensive (filesystem reads for every media folder on
 * every request). This module provides a simple TTL-based cache so repeated
 * requests within a short window reuse the last computed result.
 *
 * Cache entries are invalidated explicitly after upload/delete operations so
 * the catalog always reflects the current filesystem state after writes.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 30_000; // 30 seconds

/** Retrieve a cached value, or null if missing/expired. */
export function get<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Store a value in the cache with an optional TTL (ms). */
export function set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** Remove a specific cache entry. */
export function invalidate(key: string): void {
  cache.delete(key);
}

/** Clear all cached entries. */
export function invalidateAll(): void {
  cache.clear();
}

/** Cache key for the full media catalog. */
export const CATALOG_CACHE_KEY = "media:catalog";