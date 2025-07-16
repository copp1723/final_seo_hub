import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { SEO_PACKAGES } from '@/lib/seo-packages'

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.api(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response || errorResponse('Unauthorized', 401)
  
  try {
    // Get current month's start and end dates
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    // Fetch all requests for current month
    const monthlyRequests = await prisma.requests.findMany({
      where: {
        userId: authResult.user!.id,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      select: {
        type: true,
        status: true,
        packageType: true,
        pagesCompleted: true,
        blogsCompleted: true,
        gbpPostsCompleted: true,
        improvementsCompleted: true
      }
    })
    
    // Group by package type
    const packageUsage: Record<string, any> = {}
    
    for (const pkgType of Object.keys(SEO_PACKAGES)) {
      const pkg = SEO_PACKAGES[pkgType as keyof typeof SEO_PACKAGES]
      const requests = monthlyRequests.filter(r => r.packageType === pkgType)
      
      let pagesCompleted = 0
      let blogsCompleted = 0
      let gbpPostsCompleted = 0
      
      requests.forEach(request => {
        pagesCompleted += request.pagesCompleted
        blogsCompleted += request.blogsCompleted
        gbpPostsCompleted += request.gbpPostsCompleted
      })
      
      packageUsage[pkgType] = {
        package: pkg,
        usage: {
          pages: {
            used: pagesCompleted,
            total: pkg.breakdown.pages,
            remaining: Math.max(0, pkg.breakdown.pages - pagesCompleted)
          },
          blogs: {
            used: blogsCompleted,
            total: pkg.breakdown.blogs,
            remaining: Math.max(0, pkg.breakdown.blogs - blogsCompleted)
          },
          gbpPosts: {
            used: gbpPostsCompleted,
            total: pkg.breakdown.gbpPosts,
            remaining: Math.max(0, pkg.breakdown.gbpPosts - gbpPostsCompleted)
          }
        },
        totalUsed: pagesCompleted + blogsCompleted + gbpPostsCompleted,
        totalAvailable: pkg.totalTasks,
        percentageUsed: Math.round(((pagesCompleted + blogsCompleted + gbpPostsCompleted) / pkg.totalTasks) * 100)
      }
    }
    
    // Get user's active package (most recent request with package type)
    const latestPackageRequest = await prisma.requests.findFirst({
      where: {
        userId: authResult.user!.id,
        packageType: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { packageType: true }
    })
    
    const responseData = {
      currentPackage: latestPackageRequest?.packageType || null,
      packageUsage,
      currentMonth: {
        month: now.toLocaleString('default', { month: 'long' }),
        year: now.getFullYear()
      }
    }
    
    // Add diagnostic logging
    logger.info('Usage API response data:', { ...responseData, userId: authResult.user!.id })
    
    return successResponse(responseData)
  } catch (error) {
    logger.error('Error fetching package usage:', error, { userId: authResult.user!.id })
    return errorResponse('Failed to fetch package usage', 500)
  }
}
