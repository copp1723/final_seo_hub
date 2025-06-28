/**
 * Lightweight Feature Flag System
 * Enables safe rollouts and progressive feature deployment
 */

export interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
}

export interface FeatureFlagContext {
  userId?: string
  agencyId?: string
}

/**
 * Feature Flag Service
 * Simple in-memory implementation for MVP
 */
class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>()

  constructor() {
    this.initializeDefaultFlags()
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags() {
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'AI_CHAT',
        name: 'AI Chat Support',
        description: 'Enable AI-powered chat for request details',
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        key: 'BULK_UPLOAD',
        name: 'Bulk Request Upload',
        description: 'Allow CSV upload for multiple requests',
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        key: 'ADVANCED_ANALYTICS',
        name: 'Advanced Analytics',
        description: 'Enhanced analytics dashboard',
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        key: 'REQUEST_TEMPLATES',
        name: 'Request Templates',
        description: 'Pre-filled templates for common requests',
        enabled: true,
        rolloutPercentage: 50,
      },
    ]

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag)
    })
  }

  /**
   * Check if a feature flag is enabled for the given context
   */
  isEnabled(flagKey: string, context: FeatureFlagContext = {}): boolean {
    const flag = this.flags.get(flagKey)

    if (!flag || !flag.enabled) {
      return false
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && context.userId) {
      const userHash = this.hashUserId(context.userId)
      const userPercentile = userHash % 100
      if (userPercentile >= flag.rolloutPercentage) {
        return false
      }
    }

    return true
  }

  /**
   * Create a simple hash from user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Get all flags (for admin dashboard)
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  /**
   * Update a feature flag
   */
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(flagKey)
    if (!flag) {
      return false
    }

    this.flags.set(flagKey, { ...flag, ...updates })
    return true
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagService()

/**
 * Utility function for server-side feature flag checks
 */
export function checkFeatureFlag(flagKey: string, context: FeatureFlagContext = {}): boolean {
  return featureFlags.isEnabled(flagKey, context)
}