// SEO Package definitions - MUST remain exactly as specified
export const SEO_PACKAGES = {
  SILVER: {
    name: 'Silver',
    totalTasks: 24,
    breakdown: {
      pages: 3,
      blogs: 4,
      gbpPosts: 8,
    }
  },
  GOLD: {
    name: 'Gold',
    totalTasks: 42,
    breakdown: {
      pages: 6,
      blogs: 8,
      gbpPosts: 16,
    }
  },
  PLATINUM: {
    name: 'Platinum',
    totalTasks: 61,
    breakdown: {
      pages: 9,
      blogs: 12,
      gbpPosts: 20,
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
      }
    }
  })
  
  progress.activeTasks = progress.totalTasks - progress.completedTasks
  
  return progress
}