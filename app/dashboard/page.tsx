import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { getUserPackageProgress, PackageProgress } from '@/lib/package-utils'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch all dashboard data in a single efficient query
  const dashboardData = await prisma.request.groupBy({
    by: ['status'],
    where: {
      userId: session.user.id
    },
    _count: true
  })

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

  // Calculate stats from grouped data
  const statusCounts = dashboardData.reduce((acc, item) => {
    acc[item.status] = item._count
    return acc
  }, {} as Record<string, number>)

  const activeRequests = statusCounts['IN_PROGRESS'] || 0
  const totalRequests = dashboardData.reduce((sum, item) => sum + item._count, 0)

  // Use packageProgress for "Tasks Completed" card
  const tasksCompletedThisMonth = packageProgress ? packageProgress.totalTasks.completed : 0
  const tasksTotalThisMonth = packageProgress ? packageProgress.totalTasks.total : 0
  const tasksSubtitle = packageProgress
    ? `${tasksCompletedThisMonth} of ${tasksTotalThisMonth} used this month`
    : "No active package"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {session.user.name || session.user.email}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Requests</CardTitle>
              <Clock className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tasks Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tasksCompletedThisMonth}</p>
              <p className="text-xs text-gray-500 mt-1">{tasksSubtitle}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalRequests}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/requests">
                <Button variant="secondary" className="w-full justify-between">
                  View All Requests
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/requests?action=new">
                <Button className="w-full justify-between">
                  Create New Request
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}