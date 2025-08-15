// Import standardized package limits from central source
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'

// SEO Package definitions - synchronized with knowledge base
export const SEO_PACKAGES = {
  SILVER: {
    name: 'Silver',
    totalTasks: SEO_KNOWLEDGE_BASE.packages.silver.pages + SEO_KNOWLEDGE_BASE.packages.silver.blogs + SEO_KNOWLEDGE_BASE.packages.silver.gbpPosts + SEO_KNOWLEDGE_BASE.packages.silver.improvements,
    breakdown: {
      pages: SEO_KNOWLEDGE_BASE.packages.silver.pages,
      blogs: SEO_KNOWLEDGE_BASE.packages.silver.blogs,
      gbpPosts: SEO_KNOWLEDGE_BASE.packages.silver.gbpPosts,
      improvements: SEO_KNOWLEDGE_BASE.packages.silver.improvements
    }
  },
  GOLD: {
    name: 'Gold',
    totalTasks: SEO_KNOWLEDGE_BASE.packages.gold.pages + SEO_KNOWLEDGE_BASE.packages.gold.blogs + SEO_KNOWLEDGE_BASE.packages.gold.gbpPosts + SEO_KNOWLEDGE_BASE.packages.gold.improvements,
    breakdown: {
      pages: SEO_KNOWLEDGE_BASE.packages.gold.pages,
      blogs: SEO_KNOWLEDGE_BASE.packages.gold.blogs,
      gbpPosts: SEO_KNOWLEDGE_BASE.packages.gold.gbpPosts,
      improvements: SEO_KNOWLEDGE_BASE.packages.gold.improvements
    }
  },
  PLATINUM: {
    name: 'Platinum',
    totalTasks: SEO_KNOWLEDGE_BASE.packages.platinum.pages + SEO_KNOWLEDGE_BASE.packages.platinum.blogs + SEO_KNOWLEDGE_BASE.packages.platinum.gbpPosts + SEO_KNOWLEDGE_BASE.packages.platinum.improvements,
    breakdown: {
      pages: SEO_KNOWLEDGE_BASE.packages.platinum.pages,
      blogs: SEO_KNOWLEDGE_BASE.packages.platinum.blogs,
      gbpPosts: SEO_KNOWLEDGE_BASE.packages.platinum.gbpPosts,
      improvements: SEO_KNOWLEDGE_BASE.packages.platinum.improvements
    }
  }
} as const

export type PackageType = keyof typeof SEO_PACKAGES

export interface PackageProgress {
  packageType: PackageType
  totalTasks: number
  completedTasks: number
  activeTasks: number
  breakdown: {
    pages: { total: number; completed: number }
    blogs: { total: number; completed: number }
    gbpPosts: { total: number; completed: number }
    improvements: { total: number; completed: number }
  }
}

export function calculatePackageProgress(
  packageType: PackageType,
  requests: Array<{ type: string; status: string }>
): PackageProgress {
  const pkg = SEO_PACKAGES[packageType]
  
  const progress: PackageProgress = {
    packageType,
    totalTasks: pkg.totalTasks,
    completedTasks: 0,
    activeTasks: 0,
    breakdown: {
      pages: { total: pkg.breakdown.pages, completed: 0 },
      blogs: { total: pkg.breakdown.blogs, completed: 0 },
      gbpPosts: { total: pkg.breakdown.gbpPosts, completed: 0 },
      improvements: { total: pkg.breakdown.improvements, completed: 0 }
    }
  }
  
  requests.forEach(request => {
    if (request.status === 'completed') {
      progress.completedTasks++
      
      switch (request.type) {
        case 'page':
          progress.breakdown.pages.completed++
          break
        case 'blog':
          progress.breakdown.blogs.completed++
          break
        case 'gbp_post':
          progress.breakdown.gbpPosts.completed++
          break
        case 'improvement':
          progress.breakdown.improvements.completed++
          break
      }
    }
  })
  
  progress.activeTasks = progress.totalTasks - progress.completedTasks
  
  return progress
}
