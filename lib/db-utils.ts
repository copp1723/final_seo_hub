import { Prisma, RequestStatus } from '@prisma/client'
import { prisma } from './prisma'

/**
 * Database utilities for query optimization
 */

// Batch operations to reduce database round trips
export const batchOperations = {
  // Update multiple requests in a single transaction
  async updateRequestStatuses(
    updates: Array<{ id: string; status: RequestStatus; completedAt?: Date }>
  ) {
    return prisma.$transaction(
      updates.map(update =>
        prisma.requests.update({
          where: { id: update.id },
          data: {
            status: update.status,
            completedAt: update.completedAt,
            updatedAt: new Date()
          }
        })
      )
    )
  },

  // Batch create user preferences
  async createUserPreferences(userIds: string[]) {
    const data = userIds.map(userId => ({
      userId,
      emailNotifications: true,
      requestCreated: true,
      statusChanged: true,
      taskCompleted: true,
      weeklySummary: true,
      marketingEmails: false
    }))

    return prisma.user_preferences.createMany({
      data,
      skipDuplicates: true
    })
  }
}

// Optimized query builders
export const optimizedQueries = {
  // Get user with all related data in one query
  async getUserWithRelations(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      include: {
        agencies: {
          select: {
            id: true,
            name: true
          }
        },
        dealerships: {
          select: {
            id: true,
            name: true
          }
        },
        user_preferences: true
      }
    })
  },

  // Get requests with pagination and filtering
  async getRequestsPaginated(params: {
    userId: string
    page: number
    pageSize: number
    status?: RequestStatus
    search?: string
    orderBy?: 'createdAt' | 'updatedAt' | 'completedAt'
    orderDirection?: 'asc' | 'desc'
  }) {
    const {
      userId,
      page,
      pageSize,
      status,
      search,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = params

    const where: Prisma.requestsWhereInput = {
      userId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    const [requests, total] = await prisma.$transaction([
      prisma.requests.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          priority: true,
          packageType: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          pagesCompleted: true,
          blogsCompleted: true,
          gbpPostsCompleted: true,
          improvementsCompleted: true,
          keywords: true,
          targetUrl: true,
          completedTasks: true
        }
      }),
      prisma.requests.count({ where })
    ])

    return {
      requests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  },

  // Get dashboard statistics with single query
  async getDashboardStats(userId: string) {
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const [
      pendingCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      monthlyCompleted,
      recentRequests,
      packageProgress
    ] = await prisma.$transaction([
      // Status counts - split into individual queries to avoid groupBy complexity
      prisma.requests.count({ where: { userId, status: 'PENDING' } }),
      prisma.requests.count({ where: { userId, status: 'IN_PROGRESS' } }),
      prisma.requests.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.requests.count({ where: { userId, status: 'CANCELLED' } }),
      // Monthly completed
      prisma.requests.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: currentMonth }
        }
      }),
      // Recent requests
      prisma.requests.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true
        }
      }),
      // Package progress
      prisma.requests.aggregate({
        where: {
          userId,
          packageType: { not: null }
        },
        _sum: {
          pagesCompleted: true,
          blogsCompleted: true,
          gbpPostsCompleted: true,
          improvementsCompleted: true
        }
      })
    ])

    return {
      statusCounts: {
        PENDING: pendingCount,
        IN_PROGRESS: inProgressCount,
        COMPLETED: completedCount,
        CANCELLED: cancelledCount
      },
      monthlyCompleted,
      recentRequests,
      totalTasksCompleted: Object.values(packageProgress._sum || {})
        .reduce((sum: number, val: unknown) => sum + (typeof val === 'number' ? val : 0), 0)
    }
  }
}

// Connection pool optimization
export const connectionHealth = {
  // Check database connection
  async check() {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { healthy: true, latency: 0 }
    } catch (error) {
      return { healthy: false, error }
    }
  },

  // Get connection pool stats
  async getPoolStats() {
    // This would be more detailed with actual pool metrics
    // For now, return basic info
    return {
      active: true,
      idle: 0,
      total: 1
    }
  }
}
