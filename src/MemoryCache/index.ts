import Logger from "../Logger";

/**
 * In-memory cache with per-entry TTL expiration and LRU-style eviction.
 *
 * Keys are `string` and values are generic (`T`).
 * Expired entries are removed lazily on `get` and periodically by a cleanup timer.
 */
class MemoryCache<T> {
    private cache: Map<string, { value: T; expiry: number }> = new Map();
    private maxSize: number;
    private ttl: number;
    private cleanupInterval: ReturnType<typeof setInterval>;

    /**
     * Creates a cache instance.
     *
     * @param maxSize Maximum number of live entries allowed in cache. Must be >= 1.
     * @param ttl Time-to-live in milliseconds for each entry from write time. Must be >= 1.
     */
    constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
        if (!Number.isFinite(maxSize) || maxSize < 1) {
            throw new RangeError('maxSize must be a finite number greater than or equal to 1.');
        }
        if (!Number.isFinite(ttl) || ttl < 1) {
            throw new RangeError('ttl must be a finite number greater than or equal to 1.');
        }

        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    /**
     * Removes expired entries from the cache.
     */
    private cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now >= item.expiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Stores or updates a value in cache.
     * If the key already exists, the value and expiry are replaced.
     * If capacity is reached and key is new, least-recently-used entry is evicted.
     *
     * @param key Cache key.
     * @param value Value to store.
     */
    set(key: string, value: T) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, { value, expiry: Date.now() + this.ttl });
    }

    /**
     * Reads a value by key.
     * Returns `undefined` if the key does not exist or if the entry has expired.
     * Access refreshes recency for eviction order (LRU behavior).
     *
     * @param key Cache key.
     * @returns Cached value or `undefined`.
     */
    get(key: string): T | undefined {
        const item = this.cache.get(key);
        if (!item) return undefined;
        if (Date.now() >= item.expiry) {
            this.cache.delete(key);
            return undefined;
        }
        this.cache.delete(key);
        Logger.logMessage('MemoryCache.get', `Successfully read cache data for key: ${key}`);
        this.cache.set(key, item);
        return item.value;
    }

    /**
     * Stops the background cleanup timer.
     * Call when the cache instance is no longer needed.
     */
    dispose() {
        clearInterval(this.cleanupInterval);
    }
}

export default MemoryCache;
