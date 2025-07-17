import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/api-auth'
import { startOfMonth, endOfMonth } from 'date-fns'
import { PackageType } from '@prisma/client'

// Package limits definition
const PACKAGE_LIMITS = {
  SILVER: { pages: 3, blogs: 4, gbpPosts: 8, improvements: 8 },
  GOLD: { pages: 6, blogs: 8, gbpPosts: 16, improvements: 10 },
  PLATINUM: { pages: 9, blogs: 12, gbpPosts: 20, improvements: 20 }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  const user = authResult.user
  const { searchParams } = new URL(request.url)
  const dealershipId = searchParams.get('dealershipId') || user.dealershipId

  try {
    // If user has a dealership, fetch dealership-specific data
    if (dealershipId) {
      // Get dealership details
      const dealership = await prisma.dealerships.findUnique({
        where: { id: dealershipId }
      })

      if (!dealership) {
        return errorResponse('Dealership not found', 404)
      }

      // Get current month's date range
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      // Get all requests for this dealership
      const allRequests = await prisma.requests.findMany({
        where: { dealershipId },
        orderBy: { createdAt: 'desc' }
      })

      // Get active requests
      const activeRequests = allRequests.filter(r => 
        r.status === 'PENDING' || r.status === 'IN_PROGRESS'
      ).length

      // Get completed tasks this month
      const completedThisMonth = allRequests.filter(r => 
        r.status === 'COMPLETED' && 
        r.completedAt && 
        r.completedAt >= monthStart && 
        r.completedAt <= monthEnd
      )

      // Calculate tasks completed by type
      const tasksCompleted = {
        pages: completedThisMonth.filter(r => r.type === 'page').length,
        blogs: completedThisMonth.filter(r => r.type === 'blog').length,
        gbpPosts: completedThisMonth.filter(r => r.type === 'gbp_post').length,
        improvements: completedThisMonth.filter(r => r.type === 'improvement').length
      }

      // Get package details
      const packageType = dealership.activePackageType || 'SILVER'
      const limits = PACKAGE_LIMITS[packageType as keyof typeof PACKAGE_LIMITS]
      
      // Calculate package progress
      const packageProgress = {
        packageType,
        pages: {
          completed: dealership.pagesUsedThisPeriod,
          total: limits.pages,
          used: dealership.pagesUsedThisPeriod,
          limit: limits.pages,
          percentage: Math.round((dealership.pagesUsedThisPeriod / limits.pages) * 100)
        },
        blogs: {
          completed: dealership.blogsUsedThisPeriod,
          total: limits.blogs,
          used: dealership.blogsUsedThisPeriod,
          limit: limits.blogs,
          percentage: Math.round((dealership.blogsUsedThisPeriod / limits.blogs) * 100)
        },
        gbpPosts: {
          completed: dealership.gbpPostsUsedThisPeriod,
          total: limits.gbpPosts,
          used: dealership.gbpPostsUsedThisPeriod,
          limit: limits.gbpPosts,
          percentage: Math.round((dealership.gbpPostsUsedThisPeriod / limits.gbpPosts) * 100)
        },
        improvements: {
          completed: dealership.improvementsUsedThisPeriod,
          total: limits.improvements,
          used: dealership.improvementsUsedThisPeriod,
          limit: limits.improvements,
          percentage: Math.round((dealership.improvementsUsedThisPeriod / limits.improvements) * 100)
        },
        totalTasks: {
          completed: dealership.pagesUsedThisPeriod + dealership.blogsUsedThisPeriod + 
                    dealership.gbpPostsUsedThisPeriod + dealership.improvementsUsedThisPeriod,
          total: limits.pages + limits.blogs + limits.gbpPosts + limits.improvements
        }
      }

      // Check GA4 connection
      const ga4Connection = await prisma.ga4_connections.findFirst({
        where: { 
          userId: user.id,
          dealershipId 
        }
      })

      // Get recent activity
      const recentRequests = allRequests.slice(0, 5)
      const recentActivity = recentRequests.map(req => {
        let description = ''
        let type = ''
        
        switch (req.type) {
          case 'page':
            description = `New page "${req.title}" ${req.status === 'COMPLETED' ? 'completed' : 'in progress'}`
            type = 'page_' + (req.status === 'COMPLETED' ? 'completed' : 'progress')
            break
          case 'blog':
            description = `Blog post "${req.title}" ${req.status === 'COMPLETED' ? 'completed' : 'in progress'}`
            type = 'blog_' + (req.status === 'COMPLETED' ? 'completed' : 'progress')
            break
          case 'gbp_post':
            description = `Google Business Profile post ${req.status === 'COMPLETED' ? 'published' : 'scheduled'}`
            type = 'gbp_' + (req.status === 'COMPLETED' ? 'completed' : 'progress')
            break
          case 'improvement':
            description = `SEO improvements ${req.status === 'COMPLETED' ? 'applied' : 'in progress'}`
            type = 'improvement_' + (req.status === 'COMPLETED' ? 'completed' : 'progress')
            break
          default:
            description = req.title
            type = 'task_' + (req.status === 'COMPLETED' ? 'completed' : 'progress')
        }

        const timeAgo = getTimeAgo(req.createdAt)
        
        return {
          id: req.id,
          description,
          time: timeAgo,
          type
        }
      })

      const totalCompleted = packageProgress.totalTasks.completed
      const totalTasks = packageProgress.totalTasks.total

      return NextResponse.json({
        activeRequests,
        totalRequests: allRequests.length,
        tasksCompletedThisMonth: totalCompleted,
        tasksSubtitle: `${totalCompleted} of ${totalTasks} tasks completed this month`,
        gaConnected: !!ga4Connection,
        packageProgress,
        latestRequest: {
          packageType,
          pagesCompleted: dealership.pagesUsedThisPeriod,
          blogsCompleted: dealership.blogsUsedThisPeriod,
          gbpPostsCompleted: dealership.gbpPostsUsedThisPeriod,
          improvementsCompleted: dealership.improvementsUsedThisPeriod
        },
        dealershipId,
        recentActivity
      })
    } else {
      // User doesn't have a dealership - return user-specific data
      const userRequests = await prisma.requests.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      const activeRequests = userRequests.filter(r => 
        r.status === 'PENDING' || r.status === 'IN_PROGRESS'
      ).length

      const completedRequests = userRequests.filter(r => 
        r.status === 'COMPLETED'
      ).length

      return NextResponse.json({
        activeRequests,
        totalRequests: userRequests.length,
        tasksCompletedThisMonth: completedRequests,
        tasksSubtitle: `${completedRequests} tasks completed`,
        gaConnected: false,
        packageProgress: null,
        latestRequest: null,
        dealershipId: null,
        recentActivity: []
      })
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return errorResponse('Failed to fetch dashboard data', 500)
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return date.toLocaleDateString()
}