import { unstable_cache } from 'next/cache'
import { CACHE_TTL } from './constants'

/**
 * Cache utilities for Next.js App Router
 * Uses Next.js built-in caching mechanisms
 */

// Cache tags for invalidation
export const CACHE_TAGS = {
  USER: (userId: string) => `user-${userId}`,
  REQUESTS: (userId: string) => `requests-${userId}`,
  REQUEST: (requestId: string) => `request-${requestId}`,
  ANALYTICS: (userId: string) => `analytics-${userId}`,
  SEARCH_CONSOLE: (userId: string) => `search-console-${userId}`,
  GA4: (userId: string) => `ga4-${userId}`,
  PREFERENCES: (userId: string) => `preferences-${userId}`
} as const

// Revalidate specific cache tags
export async function revalidateCache(tags: string | string[]) {
  const { revalidateTag } = await import('next/cache')
  const tagsArray = Array.isArray(tags) ? tags : [tags]
  
  for (const tag of tagsArray) {
    revalidateTag(tag)
  }
}

// Create a cached function with automatic tag management
export function createCachedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    tags: ((...args: Parameters<T>) => string[]) | string[]
    revalidate?: number
    name: string
  }
): T {
  return unstable_cache(
    fn,
    [options.name],
    {
      tags: typeof options.tags === 'function' ? undefined : options.tags,
      revalidate: options.revalidate || 60, // Default to 1 minute
    }
  ) as T
}

// Cached database queries
export const cachedQueries = {
  // User preferences with 15-minute cache
  getUserPreferences: createCachedFunction(
    async (userId: string) => {
      const { prisma } = await import('./prisma')
      return prisma.user_preferences.findUnique({
        where: { userId }
      })
    },
    {
      name: 'getUserPreferences',
      tags: (userId: string) => [CACHE_TAGS.PREFERENCES(userId)],
      revalidate: CACHE_TTL.USER_DATA / 1000, // Convert to seconds
    }
  ),

  // User's requests with 5-minute cache
  getUserRequests: createCachedFunction(
    async (userId: string, limit?: number) => {
      const { prisma } = await import('./prisma')
      return prisma.requests.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    },
    {
      name: 'getUserRequests',
      tags: (userId: string) => [CACHE_TAGS.REQUESTS(userId)],
      revalidate: CACHE_TTL.ANALYTICS / 1000
    }
  ),

  // Dashboard stats with 5-minute cache
  getDashboardStats: createCachedFunction(
    async (userId: string) => {
      const { prisma } = await import('./prisma')
      
      const [statusCounts, completedThisMonth, latestRequest] = await Promise.all([
        prisma.requests.groupBy({
          by: ['status'],
          where: { userId },
          _count: true
        }),
        prisma.requests.count({
          where: {
            userId,
            status: 'COMPLETED',
            completedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }),
        prisma.requests.findFirst({
          where: {
            userId,
            packageType: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          select: {
            packageType: true,
            pagesCompleted: true,
            blogsCompleted: true,
            gbpPostsCompleted: true,
            improvementsCompleted: true
          }
        })
      ])
      
      return {
        statusCounts,
        completedThisMonth,
        latestRequest
      }
    },
    {
      name: 'getDashboardStats',
      tags: (userId: string) => [CACHE_TAGS.USER(userId), CACHE_TAGS.REQUESTS(userId)],
      revalidate: CACHE_TTL.ANALYTICS / 1000
    }
  ),

  // Search Console connection status with 5-minute cache
  getSearchConsoleStatus: createCachedFunction(
    async (userId: string) => {
      const { prisma } = await import('./prisma')
      return prisma.search_console_connections.findUnique({
        where: { userId },
        select: {
          id: true,
          siteUrl: true,
          siteName: true
        }
      })
    },
    {
      name: 'getSearchConsoleStatus',
      tags: (userId: string) => [CACHE_TAGS.SEARCH_CONSOLE(userId)],
      revalidate: CACHE_TTL.ANALYTICS / 1000
    }
  ),

  // GA4 connection status with 5-minute cache
  getGA4Status: createCachedFunction(
    async (userId: string) => {
      const { prisma } = await import('./prisma')
      return prisma.ga4_connections.findUnique({
        where: { userId },
        select: {
          id: true,
          propertyId: true,
          propertyName: true
        }
      })
    },
    {
      name: 'getGA4Status',
      tags: (userId: string) => [CACHE_TAGS.GA4(userId)],
      revalidate: CACHE_TTL.ANALYTICS / 1000
    }
  )
}

// Memory cache for rate limiting and temporary data
class MemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map()
  
  set(key: string, value: any, ttlMs: number) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    })
  }
  
  get(key: string) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }
  
  delete(key: string) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
  }
  
  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    for (const [key, item] of entries) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Global memory cache instance
export const memoryCache = new MemoryCache()

// Run cleanup every minute
if (typeof window === 'undefined') {
  setInterval(() => memoryCache.cleanup(), 60000)
}
