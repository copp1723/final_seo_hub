import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
 feature/TICKET-009-dashboard-enhancements
import { FileText, CheckCircle, Clock, ArrowRight, List, AlertTriangle, CalendarDays } from 'lucide-react' // Added List, AlertTriangle, CalendarDays
import { differenceInDays, format } from 'date-fns' // For date formatting
=======
import { FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { getUserPackageProgress, PackageProgress } from '@/lib/package-utils'
 main

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const userId = session.user.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
  const nextSevenDays = new Date(now.setDate(now.getDate() + 7))

 feature/TICKET-009-dashboard-enhancements
  // Fetch all dashboard data in parallel
  const [
    statusDistribution,
    requestsCompletedThisMonthData,
    monthlyPackageUsageData,
    recentActivities,
    upcomingDeadlinesData
  ] = await Promise.all([
    // 1. Status Distribution (already partially fetched, refining)
    prisma.request.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    // 2. Tasks Completed This Month (Corrected Logic)
    prisma.request.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        pagesCompleted: true,
        blogsCompleted: true,
        gbpPostsCompleted: true,
        improvementsCompleted: true,
      },
    }),
    // 3. Monthly Package Usage (for progress bars)
    // For simplicity, counting tasks from requests active or completed this month.
    // This might need refinement based on specific package definitions.
    prisma.request.findMany({
      where: {
        userId,
        OR: [
          { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          { completedAt: { gte: startOfMonth, lte: endOfMonth } },
          { status: 'IN_PROGRESS' } // consider active requests as part of current usage
        ]
      },
      select: {
        pagesPlanned: true,
        blogsPlanned: true,
        gbpPostsPlanned: true,
        improvementsPlanned: true,
        // If you want to show completed vs planned, select completed fields too
        // pagesCompleted: true,
        // blogsCompleted: true,
        // etc.
      }
    }),
    // 4. Recent Activity Timeline (fetch last 5 request updates)
    // This is a simplified version; a dedicated audit log table would be better.
    prisma.request.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    // 5. Upcoming Tasks/Deadlines
    prisma.request.findMany({
      where: {
        userId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: {
          gte: new Date(), // Due date is today or in the future
          lte: nextSevenDays // Due date is within the next 7 days
        },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
      },
    }),
  ])
=======
  // Get package progress using the new utility function
  let packageProgress: PackageProgress | null = null
  if (session.user?.id) { // Ensure user ID exists
    try {
      packageProgress = await getUserPackageProgress(session.user.id)
    } catch (error) {
      console.error("Dashboard: Failed to get user package progress", error)
      // packageProgress remains null, UI will handle this
    }
  }

  // The completedThisMonth calculation can remain if it's used elsewhere,
  // or be removed if packageProgress.totalTasks.completed is sufficient.
  // For now, I'll assume it might be used for a different metric or can be removed later if redundant.
  const completedThisMonth = await prisma.request.count({
    where: {
      userId: session.user.id,
      status: 'COMPLETED',
      completedAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  })
 main

  // --- Process Data ---

  // Status Distribution
  const statusCounts = statusDistribution.reduce((acc, item) => {
    acc[item.status] = item._count
    return acc
  }, {} as Record<string, number>)
  const activeRequests = statusCounts['IN_PROGRESS'] || 0
  const totalRequests = statusDistribution.reduce((sum, item) => sum + item._count, 0)

  // Tasks Completed This Month
  const tasksCompletedThisMonth = requestsCompletedThisMonthData.reduce((sum, req) => {
    return sum + (req.pagesCompleted || 0) + (req.blogsCompleted || 0) + (req.gbpPostsCompleted || 0) + (req.improvementsCompleted || 0)
  }, 0)

  // Monthly Package Usage (Summing up 'planned' items for simplicity)
  const monthlyPackageUsage = monthlyPackageUsageData.reduce(
    (acc, req) => {
      acc.pages += req.pagesPlanned || 0
      acc.blogs += req.blogsPlanned || 0
      acc.gbpPosts += req.gbpPostsPlanned || 0
      acc.improvements += req.improvementsPlanned || 0
      return acc
    },
    { pages: 0, blogs: 0, gbpPosts: 0, improvements: 0 }
  )

  // Format Recent Activities
  const formattedRecentActivities = recentActivities.map(activity => {
    let description = `Request "${activity.title || activity.id}" `
    if (activity.createdAt.getTime() === activity.updatedAt.getTime()) {
      description += `was created.`
    } else {
      description += `status changed to ${activity.status}.`
    }
    return {
      id: activity.id,
      description,
      time: format(activity.updatedAt, "PPp"), // e.g., May 22, 2024, 10:30 AM
      rawTime: activity.updatedAt
    }
  }).sort((a,b) => b.rawTime.getTime() - a.rawTime.getTime()); // Ensure descending order


  // Format Upcoming Deadlines
  const formattedUpcomingDeadlines = upcomingDeadlinesData.map(task => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ? format(task.dueDate, "MMM dd, yyyy") : 'N/A',
    daysRemaining: task.dueDate ? differenceInDays(task.dueDate, new Date()) : Infinity,
    status: task.status
  }))


  // Placeholder for GA4 Data - to be implemented if details provided
  const ga4Data = { connected: false, metrics: {} } // Example structure

  // Import new components
  const StatusDistributionChart = (await import('@/components/dashboard/StatusDistributionChart')).default
  const PackageUsageProgress = (await import('@/components/dashboard/PackageUsageProgress')).default
  const RecentActivityTimeline = (await import('@/components/dashboard/RecentActivityTimeline')).default
  const UpcomingTasks = (await import('@/components/dashboard/UpcomingTasks')).default
  const GA4Placeholder = () => ( // Simple placeholder for GA4
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Performance Metrics (GA4)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">
          {ga4Data.connected ? 'GA4 metrics would be displayed here.' : 'Google Analytics 4 not connected.'}
        </p>
      </CardContent>
    </Card>
  )

 feature/TICKET-009-dashboard-enhancements
=======
  // Use packageProgress for "Tasks Completed" card
  const tasksCompletedThisMonth = packageProgress ? packageProgress.totalTasks.completed : 0
  const tasksTotalThisMonth = packageProgress ? packageProgress.totalTasks.total : 0
  const tasksSubtitle = packageProgress
    ? `${tasksCompletedThisMonth} of ${tasksTotalThisMonth} used this month`
    : "No active package"
 main

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {session.user.name || session.user.email}</p>
        </div>
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tasks Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
 feature/TICKET-009-dashboard-enhancements
              <p className="text-2xl font-bold">{tasksCompletedThisMonth}</p> {/* Updated variable */}
              <p className="text-xs text-gray-500 mt-1">This month</p>
=======
              <p className="text-2xl font-bold">{tasksCompletedThisMonth}</p>
              <p className="text-xs text-gray-500 mt-1">{tasksSubtitle}</p>
 main
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalRequests}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Area - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (or main column on smaller screens) */}
          <div className="lg:col-span-2 space-y-6">
            <StatusDistributionChart statusCounts={statusCounts} />
            {ga4Data.connected && <GA4Placeholder />}
            {/* Only show GA4 placeholder if "connected", or remove this logic if always showing */}
          </div>

          {/* Right Column (or secondary column) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/requests?action=new" passHref>
                  <Button className="w-full justify-between">
                    Create New Request <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/requests" passHref>
                  <Button variant="secondary" className="w-full justify-between">
                    View All Requests <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/reports" passHref> {/* New "View Reports" button */}
                  <Button variant="outline" className="w-full justify-between">
                    View Reports <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <PackageUsageProgress usageData={monthlyPackageUsage} />
          </div>
        </div>

        {/* Bottom Section - Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UpcomingTasks tasks={formattedUpcomingDeadlines} />
          <RecentActivityTimeline activities={formattedRecentActivities} />
        </div>

        {/* GA4 Placeholder if not connected - shown at the bottom or integrated above */}
        {!ga4Data.connected && (
            <div className="mt-6"> {/* Add some margin if it's at the very bottom */}
                <GA4Placeholder />
            </div>
        )}

      </div>
    </div>
  )
}