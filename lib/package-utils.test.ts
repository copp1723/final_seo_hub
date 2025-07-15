// @ts-nocheck - To allow for Jest global types if not fully configured
import { users, PackageType, PrismaClient } from '@prisma/client'
import {
  ensureUserBillingPeriodAndRollover,
  incrementUsage,
  getUserPackageProgress,
  TaskType
} from './package-utils'
import { SEO_KNOWLEDGE_BASE } from './seo-knowledge' // Assuming this is needed for getPackageLimits

// Mock Prisma client
jest.mock('./prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    monthlyUsage: {
      create: jest.fn()
    }
  }
}))

// Helper to get current month's start and end dates
const { startOfMonth, endOfMonth, subMonths, addMonths, getMonth, getYear, startOfDay } = jest.requireActual('date-fns')

const mockPrisma = require('./prisma').default

describe('Package Utils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  const userId = 'test-user-id'
  const today = new Date('2024-07-15T10:00:00.000Z')
  const currentMonthStart = startOfMonth(today)
  const currentMonthEnd = endOfMonth(today)
  const prevMonthStart = startOfMonth(subMonths(today, 1))
  const prevMonthEnd = endOfMonth(subMonths(today, 1))

  const silverPackageLimits = SEO_KNOWLEDGE_BASE.packages.silver

  describe('ensureUserBillingPeriodAndRollover', () => {
    it('should do nothing if user has no active package', async () => {
      const mockUser: Partial<typeof users> = {
        id: userId,
        activePackageType: null,
        currentBillingPeriodStart: null,
        currentBillingPeriodEnd: null
      }
      mockPrisma.users.findUnique.mockResolvedValue(mockUser)

      const user = await ensureUserBillingPeriodAndRollover(userId)

      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({ where: { id: userId } })
      expect(mockPrisma.monthlyUsage.create).not.toHaveBeenCalled()
      expect(mockPrisma.users.update).not.toHaveBeenCalled()
      expect(user).toEqual(mockUser)
    })

    it('should do nothing if billing period is current and no rollover needed', async () => {
      const mockUser: users = {
        id: userId,
        email: 'test@example.com',
        role: 'USER',
        agencyId: null,
        onboardingCompleted: true,
        activePackageType: PackageType.SILVER,
        currentBillingPeriodStart: currentMonthStart,
        currentBillingPeriodEnd: currentMonthEnd,
        pagesUsedThisPeriod: 1,
        blogsUsedThisPeriod: 1,
        gbpPostsUsedThisPeriod: 1,
        improvementsUsedThisPeriod: 1,
        createdAt: today,
        updatedAt: today,
        monthlyUsageHistory: []
      }
      mockPrisma.users.findUnique.mockResolvedValue(mockUser)

      const user = await ensureUserBillingPeriodAndRollover(userId)

      expect(mockPrisma.monthlyUsage.create).not.toHaveBeenCalled()
      expect(mockPrisma.users.update).not.toHaveBeenCalled()
      expect(user).toEqual(mockUser)
    })

    it('should rollover usage if new month has started', async () => {
      const userBeforeRollover: users = {
        id: userId,
        email: 'test@example.com',
        role: 'USER',
        agencyId: null,
        onboardingCompleted: true,
        activePackageType: PackageType.SILVER,
        currentBillingPeriodStart: prevMonthStart, // Previous month
        currentBillingPeriodEnd: prevMonthEnd,   // Previous month
        pagesUsedThisPeriod: 2,
        blogsUsedThisPeriod: 3,
        gbpPostsUsedThisPeriod: 1,
        improvementsUsedThisPeriod: 0,
        createdAt: prevMonthStart,
        updatedAt: prevMonthStart,
        monthlyUsageHistory: []
      }
      mockPrisma.users.findUnique.mockResolvedValue(userBeforeRollover)

      const userAfterRollover: users = { ...users.eforeRollover,
        currentBillingPeriodStart: currentMonthStart,
        currentBillingPeriodEnd: currentMonthEnd,
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0
      }
      mockPrisma.users.update.mockResolvedValue(userAfterRollover)

      const user = await ensureUserBillingPeriodAndRollover(userId)

      expect(mockPrisma.monthlyUsage.create).toHaveBeenCalledWith({
        data: {
          userId: userId,
          month: getMonth(prevMonthStart) + 1,
          year: getYear(prevMonthStart),
          packageType: PackageType.SILVER,
          pagesUsed: 2,
          blogsUsed: 3,
          gbpPostsUsed: 1,
          improvementsUsed: 0
        }
      })
      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          pagesUsedThisPeriod: 0,
          blogsUsedThisPeriod: 0,
          gbpPostsUsedThisPeriod: 0,
          improvementsUsedThisPeriod: 0,
          currentBillingPeriodStart: currentMonthStart,
          currentBillingPeriodEnd: currentMonthEnd
        }
      })
      expect(user).toEqual(userAfterRollover)
    })
  })

  describe('incrementUsage', () => {
    const baseUser: users = {
      id: userId,
      email: 'test@example.com',
      role: 'USER',
      agencyId: null,
      onboardingCompleted: true,
      activePackageType: PackageType.SILVER,
      currentBillingPeriodStart: currentMonthStart,
      currentBillingPeriodEnd: currentMonthEnd,
      pagesUsedThisPeriod: 0,
      blogsUsedThisPeriod: 0,
      gbpPostsUsedThisPeriod: 0,
      improvementsUsedThisPeriod: 0,
      createdAt: today,
      updatedAt: today,
      monthlyUsageHistory: []
    }

    beforeEach(() => {
      // Default findUnique mock for incrementUsage tests
      mockPrisma.users.findUnique.mockResolvedValue(baseUser);
    });

    it('should increment page usage correctly', async () => {
      const updatedUser = { ...baseUser, pagesUsedThisPeriod: 1 }
      mockPrisma.users.update.mockResolvedValue(updatedUser)

      const user = await incrementUsage(userId, 'pages')

      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { pagesUsedThisPeriod: 1 }
      })
      expect(user.pagesUsedThisPeriod).toBe(1)
    })

    it('should throw error if no active package', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ ...baseUser, activePackageType: null })

      await expect(incrementUsage(userId, 'pages')).rejects.toThrow('User does not have an active package.')
    })

    it('should throw error if usage limit exceeded for pages', async () => {
      const userAtLimit = { ...baseUser, pagesUsedThisPeriod: silverPackageLimits.pages }
      mockPrisma.users.findUnique.mockResolvedValue(userAtLimit) // Initial find for ensureUserBillingPeriodAndRollover
      // If ensureUserBillingPeriodAndRollover updates, it would return the user.
      // Then incrementUsage would use this user state.
      // For this test, assume rollover doesn't change usage counts relevant to the check.await expect(incrementUsage(userId, 'pages')).rejects.toThrow(`Usage limit for pages exceeded for user ${userId}.`)
    })

    // Similar tests for 'blogs', 'gbpPosts', 'improvements'
    it('should increment blog usage correctly', async () => {
      const updatedUser = { ...baseUser, blogsUsedThisPeriod: 1 }
      mockPrisma.users.update.mockResolvedValue(updatedUser)
      const user = await incrementUsage(userId, 'blogs')
      expect(user.blogsUsedThisPeriod).toBe(1)
    })

    it('should throw error if usage limit exceeded for blogs', async () => {
      const userAtLimit = { ...baseUser, blogsUsedThisPeriod: silverPackageLimits.blogs }
      mockPrisma.users.findUnique.mockResolvedValue(userAtLimit)
      await expect(incrementUsage(userId, 'blogs')).rejects.toThrow(`Usage limit for blogs exceeded for user ${userId}.`)
    })
  })

  describe('getUserPackageProgress', () => {
    const baseUser: users = {
      id: userId,
      email: 'test@example.com',
      role: 'USER',
      agencyId: null,
      onboardingCompleted: true,
      activePackageType: PackageType.SILVER,
      currentBillingPeriodStart: currentMonthStart,
      currentBillingPeriodEnd: currentMonthEnd,
      pagesUsedThisPeriod: 1,
      blogsUsedThisPeriod: 2,
      gbpPostsUsedThisPeriod: 0,
      improvementsUsedThisPeriod: 1,
      createdAt: today,
      updatedAt: today,
      monthlyUsageHistory: []
    }

    it('should return correct progress for active package', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(baseUser)

      const progress = await getUserPackageProgress(userId)

      expect(progress).toEqual({
        pages: { completed: 1, total: silverPackageLimits.pages },
        blogs: { completed: 2, total: silverPackageLimits.blogs },
        gbpPosts: { completed: 0, total: silverPackageLimits.gbpPosts },
        improvements: { completed: 1, total: silverPackageLimits.improvements },
        totalTasks: {
          completed: 1 + 2 + 0 + 1,
          total: silverPackageLimits.pages + silverPackageLimits.blogs + silverPackageLimits.gbpPosts + silverPackageLimits.improvements
        }
      })
    })

    it('should return null if no active package', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ ...baseUser, activePackageType: null })

      const progress = await getUserPackageProgress(userId)
      expect(progress).toBeNull()
    })
  })
})
