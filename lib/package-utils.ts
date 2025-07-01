import { PackageType, User } from '@prisma/client'
import { SEO_KNOWLEDGE_BASE } from './seo-knowledge'
import { prisma } from './prisma'
import { getMonth, getYear, startOfMonth, endOfMonth, isAfter } from 'date-fns'

export interface PackageProgress {
  packageType: PackageType | null
  pages: { completed: number; total: number; used: number; limit: number; percentage: number }
  blogs: { completed: number; total: number; used: number; limit: number; percentage: number }
  gbpPosts: { completed: number; total: number; used: number; limit: number; percentage: number }
  improvements: { completed: number; total: number; used: number; limit: number; percentage: number }
  totalTasks: { completed: number; total: number }
}

export function getPackageLimits(packageType: PackageType) {
  const packageKey = packageType.toLowerCase() as keyof typeof SEO_KNOWLEDGE_BASE.packages
  return SEO_KNOWLEDGE_BASE.packages[packageKey]
}

export function calculatePackageProgress(
  packageType: PackageType,
  pagesCompleted: number,
  blogsCompleted: number,
  gbpPostsCompleted: number,
  improvementsCompleted: number
): PackageProgress {
  const limits = getPackageLimits(packageType)
  
  const totalCompleted = pagesCompleted + blogsCompleted + gbpPostsCompleted + improvementsCompleted
  const totalTasks = limits.pages + limits.blogs + limits.gbpPosts + limits.improvements
  
  return {
    packageType,
    pages: {
      completed: pagesCompleted,
      total: limits.pages,
      used: pagesCompleted,
      limit: limits.pages,
      percentage: limits.pages > 0 ? Math.round((pagesCompleted / limits.pages) * 100) : 0
    },
    blogs: {
      completed: blogsCompleted,
      total: limits.blogs,
      used: blogsCompleted,
      limit: limits.blogs,
      percentage: limits.blogs > 0 ? Math.round((blogsCompleted / limits.blogs) * 100) : 0
    },
    gbpPosts: {
      completed: gbpPostsCompleted,
      total: limits.gbpPosts,
      used: gbpPostsCompleted,
      limit: limits.gbpPosts,
      percentage: limits.gbpPosts > 0 ? Math.round((gbpPostsCompleted / limits.gbpPosts) * 100) : 0
    },
    improvements: {
      completed: improvementsCompleted,
      total: limits.improvements,
      used: improvementsCompleted,
      limit: limits.improvements,
      percentage: limits.improvements > 0 ? Math.round((improvementsCompleted / limits.improvements) * 100) : 0
    },
    totalTasks: { completed: totalCompleted, total: totalTasks }
  }
}

export function getPackageTotalTasks(packageType: PackageType): number {
  const limits = getPackageLimits(packageType)
  return limits.pages + limits.blogs + limits.gbpPosts + limits.improvements
}

/**
 * Ensures the user's billing period is current. If a new period has started,
 * it archives the previous period's usage and resets counters for the new period.
 */
export async function ensureUserBillingPeriodAndRollover(userId: string): Promise<User> {
  let user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error(`User with ID ${userId} not found.`)

  const now = new Date()

  // If no active package or billing period, nothing to do for rollover.
  // Initial setup is handled during package activation.
  if (!user.activePackageType || !user.currentBillingPeriodStart || !user.currentBillingPeriodEnd) {
    return user
  }

  // Check if the current date is past the current billing period's end.
  if (isAfter(now, user.currentBillingPeriodEnd)) {
    // Archive previous month's usage
    await prisma.monthlyUsage.create({
      data: {
        userId: user.id,
        month: getMonth(user.currentBillingPeriodStart) + 1, // date-fns getMonth is 0-indexed
        year: getYear(user.currentBillingPeriodStart),
        packageType: user.activePackageType,
        pagesUsed: user.pagesUsedThisPeriod,
        blogsUsed: user.blogsUsedThisPeriod,
        gbpPostsUsed: user.gbpPostsUsedThisPeriod,
        improvementsUsed: user.improvementsUsedThisPeriod,
      },
    })

    // Reset counters and update billing period for the new month
    user = await prisma.user.update({
      where: { id: userId },
      data: {
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0,
        currentBillingPeriodStart: startOfMonth(now),
        currentBillingPeriodEnd: endOfMonth(now),
      },
    })
  }
  return user
}

export type TaskType = 'pages' | 'blogs' | 'gbpPosts' | 'improvements'

/**
 * Increments usage for a specific task type for a user.
 * Throws an error if the user has no active package or if the quota is exceeded.
 */
export async function incrementUsage(userId: string, taskType: TaskType): Promise<User> {
  let user = await ensureUserBillingPeriodAndRollover(userId)

  if (!user.activePackageType) {
    throw new Error('User does not have an active package.')
  }

  const limits = getPackageLimits(user.activePackageType)
  let currentUsage: number
  let limit: number
  let updateData: Partial<User> = {}

  switch (taskType) {
    case 'pages':
      currentUsage = user.pagesUsedThisPeriod
      limit = limits.pages
      updateData = { pagesUsedThisPeriod: user.pagesUsedThisPeriod + 1 }
      break
    case 'blogs':
      currentUsage = user.blogsUsedThisPeriod
      limit = limits.blogs
      updateData = { blogsUsedThisPeriod: user.blogsUsedThisPeriod + 1 }
      break
    case 'gbpPosts':
      currentUsage = user.gbpPostsUsedThisPeriod
      limit = limits.gbpPosts
      updateData = { gbpPostsUsedThisPeriod: user.gbpPostsUsedThisPeriod + 1 }
      break
    case 'improvements':
      currentUsage = user.improvementsUsedThisPeriod
      limit = limits.improvements
      updateData = { improvementsUsedThisPeriod: user.improvementsUsedThisPeriod + 1 }
      break
    default:
      throw new Error(`Invalid task type: ${taskType}`)
  }

  if (currentUsage >= limit) {
    throw new Error(`Usage limit for ${taskType} exceeded for user ${userId}.`)
  }

  user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })
  return user
}

/**
 * Gets the current package progress for the user for the current billing period.
 */
export async function getUserPackageProgress(userId: string): Promise<PackageProgress | null> {
  try {
    const user = await ensureUserBillingPeriodAndRollover(userId)

    if (!user || !user.activePackageType) {
      console.log(`User ${userId} has no active package`)
      return null
    }

    const limits = getPackageLimits(user.activePackageType)

    // Ensure all usage values are valid numbers (default to 0 if null/undefined)
    const pagesUsed = user.pagesUsedThisPeriod ?? 0
    const blogsUsed = user.blogsUsedThisPeriod ?? 0
    const gbpPostsUsed = user.gbpPostsUsedThisPeriod ?? 0
    const improvementsUsed = user.improvementsUsedThisPeriod ?? 0

    const totalCompleted = pagesUsed + blogsUsed + gbpPostsUsed + improvementsUsed
    const totalTasks = limits.pages + limits.blogs + limits.gbpPosts + limits.improvements

    return {
      packageType: user.activePackageType,
      pages: {
        completed: pagesUsed,
        total: limits.pages,
        used: pagesUsed,
        limit: limits.pages,
        percentage: limits.pages > 0 ? Math.round((pagesUsed / limits.pages) * 100) : 0
      },
      blogs: {
        completed: blogsUsed,
        total: limits.blogs,
        used: blogsUsed,
        limit: limits.blogs,
        percentage: limits.blogs > 0 ? Math.round((blogsUsed / limits.blogs) * 100) : 0
      },
      gbpPosts: {
        completed: gbpPostsUsed,
        total: limits.gbpPosts,
        used: gbpPostsUsed,
        limit: limits.gbpPosts,
        percentage: limits.gbpPosts > 0 ? Math.round((gbpPostsUsed / limits.gbpPosts) * 100) : 0
      },
      improvements: {
        completed: improvementsUsed,
        total: limits.improvements,
        used: improvementsUsed,
        limit: limits.improvements,
        percentage: limits.improvements > 0 ? Math.round((improvementsUsed / limits.improvements) * 100) : 0
      },
      totalTasks: { completed: totalCompleted, total: totalTasks },
    }
  } catch (error) {
    console.error(`Error getting package progress for user ${userId}:`, error)
    return null
  }
}