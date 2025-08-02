import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { cacheManager } from '@/lib/cache/centralized-cache-manager'
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
      cacheManager.clearAll()
      logger.info('All cache cleared by admin', { adminId: session.user.id })
      return NextResponse.json({ 
        success: true, 
        message: 'All cache cleared',
        stats: cacheManager.getStats()
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
      cacheManager.invalidateByUser(userId)
      invalidatedCount++
    }

    // Invalidate by dealership ID
    if (dealershipId) {
      cacheManager.invalidateByDealership(dealershipId)
      invalidatedCount++
    }

    // Invalidate by patterns
    if (patterns && patterns.length > 0) {
      for (const pattern of patterns) {
        invalidatedCount += cacheManager.invalidateByPattern(pattern)
      }
    }

    // Invalidate by tags (treated as patterns)
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        invalidatedCount += cacheManager.invalidateByPattern(tag)
      }
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
      stats: cacheManager.getStats()
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

    const stats = cacheManager.getStats()

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