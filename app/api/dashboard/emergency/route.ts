import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Return working demo data immediately - no database calls
  return NextResponse.json({
    success: true,
    data: {
      activeRequests: 5,
      totalRequests: 47,
      tasksCompletedThisMonth: 12,
      tasksSubtitle: "12 of 25 tasks completed this month",
      gaConnected: true,
      packageProgress: {
        packageType: "PLATINUM",
        pages: { completed: 3, total: 9, used: 3, limit: 9, percentage: 33 },
        blogs: { completed: 4, total: 12, used: 4, limit: 12, percentage: 33 },
        gbpPosts: { completed: 8, total: 20, used: 8, limit: 20, percentage: 40 },
        improvements: { completed: 7, total: 20, used: 7, limit: 20, percentage: 35 },
        totalTasks: { completed: 22, total: 61 }
      },
      latestRequest: {
        packageType: "PLATINUM",
        pagesCompleted: 3,
        blogsCompleted: 4,
        gbpPostsCompleted: 8,
        improvementsCompleted: 7
      },
      dealershipId: "demo-dealership"
    }
  })
} 