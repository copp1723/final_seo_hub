/**
 * Multi-layer Performance Cache from Seorylie
 * Safe to use alongside existing caching strategies
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

export class PerformanceCache<T = any> {
  protected memoryCache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private stats: CacheStats;
  private namespace: string;

  constructor(namespace: string, maxSize = 50, defaultTTL = 3600000) { // 1 hour default
    this.namespace = namespace;
    this.memoryCache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get item from cache with multi-layer fallback
   */
  async get(key: string): Promise<T | null> {
    // Layer 1: Memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.stats.hits++;
      return memoryEntry.data;
    }

    // Layer 2: SessionStorage (browser only)
    if (typeof window !== 'undefined') {
      try {
        const sessionData = sessionStorage.getItem(`${this.namespace}:${key}`);
        if (sessionData) {
          const entry: CacheEntry<T> = JSON.parse(sessionData);
          if (!this.isExpired(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            this.stats.hits++;
            return entry.data;
          }
        }
      } catch (e) {
        // SessionStorage might be full or disabled
      }
    }

    // Layer 3: IndexedDB (browser only)
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        const idbData = await this.getFromIndexedDB(key);
        if (idbData && !this.isExpired(idbData)) {
          // Restore to memory and session
          this.memoryCache.set(key, idbData);
          this.saveToSessionStorage(key, idbData);
          this.stats.hits++;
          return idbData.data;
        }
      } catch (e) {
        // IndexedDB might be disabled
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set item in cache with TTL
   */
  async set(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    // Evict if necessary
    if (this.memoryCache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Layer 1: Memory
    this.memoryCache.set(key, entry);

    // Layer 2: SessionStorage
    this.saveToSessionStorage(key, entry);

    // Layer 3: IndexedDB
    await this.saveToIndexedDB(key, entry);
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (typeof window !== 'undefined') {
      // Clear SessionStorage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(`${this.namespace}:`)) {
          sessionStorage.removeItem(key);
        }
      });

      // Clear IndexedDB
      await this.clearIndexedDB();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return { ...this.stats,
      size: this.memoryCache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private saveToSessionStorage(key: string, entry: CacheEntry<T>): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(`${this.namespace}:${key}`, JSON.stringify(entry));
    } catch (e) {
      // SessionStorage might be full
      console.warn('SessionStorage save failed:', e);
    }
  }

  private async getFromIndexedDB(key: string): Promise<CacheEntry<T> | null> {
    // Simplified IndexedDB implementation
    return new Promise((resolve) => {
      const request = indexedDB.open(this.namespace, 1);
      
      request.onerror = () => resolve(null);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => resolve(null);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      };
    });
  }

  private async saveToIndexedDB(key: string, entry: CacheEntry<T>): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.namespace, 1);
      
      request.onerror = () => resolve();
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.put(entry, key);
        transaction.oncomplete = () => resolve();
      };
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const deleteReq = indexedDB.deleteDatabase(this.namespace);
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => resolve();
    });
  }
}

/**
 * Specialized cache for chat responses with semantic matching
 */
export class ChatResponseCache extends PerformanceCache<{ query: string; response: string }> {
  constructor() {
    super('chat-responses', 100, 3600000); // 100 items, 1 hour TTL
  }

  /**
   * Get response with fuzzy matching
   */
  async getWithSimilarity(query: string, threshold = 0.85): Promise<string | null> {
    // First try exact match
    const exact = await this.get(query);
    if (exact) return exact.response;

    // Then try semantic similarity
    if (typeof window !== 'undefined') {
      const allKeys = await this.getAllKeys();
      for (const key of allKeys) {
        const similarity = this.calculateSimilarity(query.toLowerCase(), key.toLowerCase());
        if (similarity >= threshold) {
          const cached = await this.get(key);
          if (cached) return cached.response;
        }
      }
    }

    return null;
  }

  private async getAllKeys(): Promise<string[]> {
    const keys: string[] = [];
    
    // Get from memory
    this.memoryCache.forEach((_, key) => keys.push(key));
    
    // Get from SessionStorage
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('chat-responses:')) {
          keys.push(key.replace('chat-responses:', ''));
        }
      });
    }

    return [...new Set(keys)]; // Remove duplicates
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1,...set2]);
    
    return intersection.size / union.size;
  }
}

// Export singleton instances for common use cases
export const ga4ReportCache = new PerformanceCache('ga4-reports');
export const chatCache = new ChatResponseCache();
