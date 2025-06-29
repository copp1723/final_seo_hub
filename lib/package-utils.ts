import { PackageType } from '@prisma/client'
import { SEO_KNOWLEDGE_BASE } from './seo-knowledge'

export interface PackageProgress {
  pages: { completed: number; total: number }
  blogs: { completed: number; total: number }
  gbpPosts: { completed: number; total: number }
  improvements: { completed: number; total: number }
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
    pages: { completed: pagesCompleted, total: limits.pages },
    blogs: { completed: blogsCompleted, total: limits.blogs },
    gbpPosts: { completed: gbpPostsCompleted, total: limits.gbpPosts },
    improvements: { completed: improvementsCompleted, total: limits.improvements },
    totalTasks: { completed: totalCompleted, total: totalTasks }
  }
}

export function getPackageTotalTasks(packageType: PackageType): number {
  const limits = getPackageLimits(packageType)
  return limits.pages + limits.blogs + limits.gbpPosts + limits.improvements
}