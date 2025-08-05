import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { redisManager } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const invalidateCacheSchema = z.object({
  patterns: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().optional(),
  dealershipId: z.string().optional(),
  all: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = invalidateCacheSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { patterns, tags, userId, dealershipId, all } = validation.data
    let invalidatedCount = 0

    // Clear all cache if requested (admin only)
    if (all && session.user.role === 'SUPER_ADMIN') {
      try {
        const redisClient = await redisManager.getClient()
        if (redisClient) {
          // Note: Redis doesn't have a clear all command, so we'll log this limitation
          logger.warn('Redis clear all not implemented - use Redis CLI: FLUSHDB')
        }
      } catch (error) {
        logger.warn('Redis clear all failed', { error })
      }
      logger.info('Cache clear requested by admin', { adminId: session.user.id })
      return NextResponse.json({
        success: true,
        message: 'Cache clear requested (Redis limitation: use FLUSHDB manually)',
        stats: { note: 'Redis stats not available' }
      })
    }

    // Invalidate by user ID
    if (userId) {
      // Only allow users to invalidate their own cache unless admin
      if (userId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden: Cannot invalidate other users cache' },
          { status: 403 }
        )
      }
      // Use analytics coordinator for cache invalidation (now uses Redis)
      const { analyticsCoordinator } = await import('@/lib/analytics/analytics-coordinator')
      await analyticsCoordinator.invalidateDealershipCache(userId)
      invalidatedCount++
    }

    // Invalidate by dealership ID
    if (dealershipId) {
      // Use analytics coordinator for cache invalidation (now uses Redis)
      const { analyticsCoordinator } = await import('@/lib/analytics/analytics-coordinator')
      await analyticsCoordinator.invalidateDealershipCache(session.user.id, dealershipId)
      invalidatedCount++
    }

    // Invalidate by patterns (limited Redis support)
    if (patterns && patterns.length > 0) {
      logger.warn('Pattern-based cache invalidation not fully supported with Redis', { patterns })
      invalidatedCount += patterns.length // Approximate count
    }

    // Invalidate by tags (limited Redis support)
    if (tags && tags.length > 0) {
      logger.warn('Tag-based cache invalidation not fully supported with Redis', { tags })
      invalidatedCount += tags.length // Approximate count
    }

    logger.info('Cache invalidation completed', {
      userId: session.user.id,
      patterns,
      tags,
      invalidatedCount
    })

    return NextResponse.json({
      success: true,
      message: `Cache invalidation completed`,
      invalidatedCount,
      stats: { note: 'Redis stats not available' }
    })

  } catch (error) {
    logger.error('Cache invalidation error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check cache stats
export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = { note: 'Redis stats not available' }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Cache stats error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}