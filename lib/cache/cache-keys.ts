/**
 * Centralized cache key generation to ensure consistency across all services
 */
export class CacheKeys {
  // Base TTL for all caches (8 minutes as recommended by architect)
  static readonly CACHE_TTL = 8 * 60 * 1000

  // Generate consistent cache keys
  static dashboard(userId: string, dateRange: string, dealershipId?: string): string {
    const date = new Date().toISOString().split('T')[0]
    return `dashboard_${userId}_${dateRange}_${dealershipId || 'user-level'}_${date}`
  }

  static analytics(userId: string, dateRange: string, dealershipId?: string): string {
    const date = new Date().toISOString().split('T')[0]
    return `analytics_${userId}_${dateRange}_${dealershipId || 'user-level'}_${date}`
  }

  static rankings(userId: string, dealershipId?: string): string {
    const date = new Date().toISOString().split('T')[0]
    return `rankings_${userId}_${dealershipId || 'user-level'}_${date}`
  }

  // Pattern matching for cache invalidation
  static getUserPattern(userId: string): string {
    return `*_${userId}_*`
  }

  static getDealershipPattern(dealershipId: string): string {
    return `*_${dealershipId}_*`
  }

  static getServicePattern(service: 'dashboard' | 'analytics' | 'rankings'): string {
    return `${service}_*`
  }
}