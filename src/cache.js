export class LRUCache {
    constructor(maxEntries = 500, ttl = null) {
        this.maxEntries = maxEntries;
        this.ttl = ttl;
        this.cache = new Map();
        this.stats = { hits: 0, misses: 0 };
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size === this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        const entry = { value: value, timestamp: Date.now() };
        this.cache.set(key, entry);
    }

    get(key) {
        if (!this.cache.has(key)) {
            this.stats.misses++;
            return null;
        }
        const entry = this.cache.get(key);
        if (this.ttl && (Date.now() - entry.timestamp > this.ttl)) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        this.stats.hits++;
        // Move to the end to mark it as most recently used
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }

    getStats() {
        return this.stats;
    }
}
