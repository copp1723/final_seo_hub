import { CacheKeys } from './cache-keys'
import { logger } from '@/lib/logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  dealershipId?: string
  userId: string
}

/**
 * Centralized cache manager with consistent TTL and invalidation
 */
export class CentralizedCacheManager {
  private static instance: CentralizedCacheManager
  private cache = new Map<string, CacheEntry<any>>()
  private readonly maxSize = 1000
  private readonly cleanupThreshold = 800

  private constructor() {}

  static getInstance(): CentralizedCacheManager {
    if (!CentralizedCacheManager.instance) {
      CentralizedCacheManager.instance = new CentralizedCacheManager()
    }
    return CentralizedCacheManager.instance
  }

  set<T>(key: string, data: T, metadata: { userId: string; dealershipId?: string }): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
      ...metadata
    })
    
    // Cleanup if needed
    if (this.cache.size > this.maxSize) {
      this.cleanup()
    }

    logger.info('Cache set', { key, dealershipId: metadata.dealershipId })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CacheKeys.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    // Update hit count
    entry.hits++
    return entry.data
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let invalidated = 0

    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    logger.info('Cache invalidated by pattern', { pattern, count: invalidated })
    return invalidated
  }

  /**
   * Invalidate all cache entries for a dealership
   */
  invalidateByDealership(dealershipId: string): void {
    const pattern = CacheKeys.getDealershipPattern(dealershipId)
    this.invalidateByPattern(pattern)
  }

  /**
   * Invalidate all cache entries for a user
   */
  invalidateByUser(userId: string): void {
    const pattern = CacheKeys.getUserPattern(userId)
    this.invalidateByPattern(pattern)
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info('Cache cleared', { entriesRemoved: size })
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; oldestEntry: number | null; mostHits: number } {
    let oldestTimestamp = Date.now()
    let maxHits = 0

    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
      }
      if (entry.hits > maxHits) {
        maxHits = entry.hits
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: this.cache.size > 0 ? Date.now() - oldestTimestamp : null,
      mostHits: maxHits
    }
  }

  /**
   * Cleanup least recently used entries
   */
  private cleanup(): void {
    // Sort by hits and timestamp (LRU)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        // First by hits, then by timestamp
        if (a[1].hits !== b[1].hits) {
          return a[1].hits - b[1].hits
        }
        return a[1].timestamp - b[1].timestamp
      })

    // Remove oldest/least used entries
    const toRemove = entries.slice(0, this.cache.size - this.cleanupThreshold)
    for (const [key] of toRemove) {
      this.cache.delete(key)
    }

    logger.info('Cache cleanup completed', { removed: toRemove.length })
  }
}

// Export singleton instance
export const cacheManager = CentralizedCacheManager.getInstance()