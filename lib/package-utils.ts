import { PackageType, dealerships } from '@prisma/client'
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
 * Ensures the dealership's billing period is current.If a new period has started,
 * it archives the previous period's usage and resets counters for the new period.
 */
export async function ensureDealershipBillingPeriodAndRollover(dealershipId: string): Promise<dealerships> {
  let dealership = await prisma.dealerships.findUnique({ where: { id: dealershipId } })
  if (!dealership) throw new Error(`Dealership with ID ${dealershipId} not found.`)

  const now = new Date()

  // If no active package or billing period, nothing to do for rollover.
  // Initial setup is handled during package activation.
  if (!dealership.activePackageType || !dealership.currentBillingPeriodStart || !dealership.currentBillingPeriodEnd) {
    return dealership
  }

  // Check if the current date is past the current billing period's end.
  if (isAfter(now, dealership.currentBillingPeriodEnd)) {
    // Archive previous month's usage
    await prisma.monthly_usage.create({
      data: {
        dealershipId: dealership.id,
        month: getMonth(dealership.currentBillingPeriodStart) + 1, // date-fns getMonth is 0-indexed
        year: getYear(dealership.currentBillingPeriodStart),
        packageType: dealership.activePackageType,
        pagesUsed: dealership.pagesUsedThisPeriod,
        blogsUsed: dealership.blogsUsedThisPeriod,
        gbpPostsUsed: dealership.gbpPostsUsedThisPeriod,
        improvementsUsed: dealership.improvementsUsedThisPeriod
      }
    })

    // Reset counters and update billing period for the new month
    dealership = await prisma.dealerships.update({
      where: { id: dealershipId },
      data: {
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0,
        currentBillingPeriodStart: startOfMonth(now),
        currentBillingPeriodEnd: endOfMonth(now)
      }
    })
  }
  
  return dealership
}

/**
 * Legacy function for user-level operations - now looks up user's dealership
 */
export async function ensureUserBillingPeriodAndRollover(userId: string): Promise<dealerships | null> {
  const user = await prisma.users.findUnique({
    where: { id: userId }
  })
  
  if (!user?.dealershipId) {
    return null // User not assigned to a dealership
  }
  
  return ensureDealershipBillingPeriodAndRollover(user.dealershipId)
}

export type TaskType = 'pages' | 'blogs' | 'gbpPosts' | 'improvements'

/**
 * Increments usage for a specific task type for a dealership.
 * Throws an error if the dealership has no active package or if the quota is exceeded.
 */
export async function incrementDealershipUsage(dealershipId: string, taskType: TaskType): Promise<dealerships> {
  let dealership = await ensureDealershipBillingPeriodAndRollover(dealershipId)

  if (!dealership.activePackageType) {
    throw new Error('Dealership does not have an active package.')
  }

  const limits = getPackageLimits(dealership.activePackageType)
  let currentUsage: number
  let limit: number
  let updateData: Partial<dealerships> = {}

  switch (taskType) {
    case 'pages':
      currentUsage = dealership.pagesUsedThisPeriod
      limit = limits.pages
      updateData = { pagesUsedThisPeriod: dealership.pagesUsedThisPeriod + 1 } as any
      break
    case 'blogs':
      currentUsage = dealership.blogsUsedThisPeriod
      limit = limits.blogs
      updateData = { blogsUsedThisPeriod: dealership.blogsUsedThisPeriod + 1 } as any
      break
    case 'gbpPosts':
      currentUsage = dealership.gbpPostsUsedThisPeriod
      limit = limits.gbpPosts
      updateData = { gbpPostsUsedThisPeriod: dealership.gbpPostsUsedThisPeriod + 1 } as any
      break
    case 'improvements':
      currentUsage = dealership.improvementsUsedThisPeriod
      limit = limits.improvements
      updateData = { improvementsUsedThisPeriod: dealership.improvementsUsedThisPeriod + 1 } as any
      break
    default:
      throw new Error(`Invalid task type: ${taskType}`)
  }

  if (currentUsage >= limit) {
    throw new Error(`Usage limit for ${taskType} exceeded for dealership ${dealershipId}.`)
  }

  // Create proper update data excluding read-only fields
  const {id, agencyId, createdAt, updatedAt, ...allowedUpdateData} = updateData as any
  
  dealership = await prisma.dealerships.update({
    where: { id: dealershipId },
    data: allowedUpdateData
  })
  return dealership
}

/**
 * Legacy function for user-level operations - now works with user's dealership
 */
export async function incrementUsage(userId: string, taskType: TaskType): Promise<dealerships | null> {
  const user = await prisma.users.findUnique({
    where: { id: userId }
  })
  
  if (!user?.dealershipId) {
    throw new Error('User is not assigned to a dealership.')
  }
  
  return incrementDealershipUsage(user.dealershipId, taskType)
}

/**
 * Gets the current package progress for the dealership for the current billing period.
 */
export async function getDealershipPackageProgress(dealershipId: string): Promise<PackageProgress | null> {
  try {
    const dealership = await ensureDealershipBillingPeriodAndRollover(dealershipId)

    if (!dealership || !dealership.activePackageType) {
      console.log(`Dealership ${dealershipId} has no active package`)
      return null
    }

    const limits = getPackageLimits(dealership.activePackageType)

    // Ensure all usage values are valid numbers (default to 0 if null/undefined)
    const pagesUsed = dealership.pagesUsedThisPeriod ?? 0
    const blogsUsed = dealership.blogsUsedThisPeriod ?? 0
    const gbpPostsUsed = dealership.gbpPostsUsedThisPeriod ?? 0
    const improvementsUsed = dealership.improvementsUsedThisPeriod ?? 0

    const totalCompleted = pagesUsed + blogsUsed + gbpPostsUsed + improvementsUsed
    const totalTasks = limits.pages + limits.blogs + limits.gbpPosts + limits.improvements

    return {
      packageType: dealership.activePackageType,
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
      totalTasks: { completed: totalCompleted, total: totalTasks }
    }
  } catch (error) {
    console.error(`Error getting package progress for dealership ${dealershipId}:`, error)
    return null
  }
}

/**
 * Legacy function for user-level operations - now works with user's dealership
 */
export async function getUserPackageProgress(userId: string): Promise<PackageProgress | null> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    })
    
    if (!user?.dealershipId) {
      console.log(`User ${userId} is not assigned to a dealership`)
      return null
    }
    
    return getDealershipPackageProgress(user.dealershipId)
  } catch (error) {
    console.error(`Error getting package progress for user ${userId}:`, error)
    return null
  }
}
