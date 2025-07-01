import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { getUserPackageProgress, PackageProgress } from '@/lib/package-utils'
import ErrorBoundary from '@/components/error-boundary'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Ensure we have a valid user ID
  const userId = session.user.id
  
  try {
    // Fetch cached dashboard data
    const { cachedQueries } = await import('@/lib/cache')
    const dashboardStats = await cachedQueries.getDashboardStats(userId)
    
    const { statusCounts: dashboardData, completedThisMonth, latestRequest } = dashboardStats

    // Get package progress using the new utility function
    let packageProgress: PackageProgress | null = null
    try {
      packageProgress = await getUserPackageProgress(userId)
    } catch (error) {
      console.error("Dashboard: Failed to get user package progress", error)
    }

    // Calculate stats with null safety
    const statusCountsMap = dashboardData.reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {})
    const activeRequests = statusCountsMap['IN_PROGRESS'] || 0
    const totalRequests = Object.values(statusCountsMap).reduce((sum: number, count: any) => sum + (count as number), 0)
    
    // Use packageProgress for "Tasks Completed" card
    const tasksCompletedThisMonth = packageProgress ? packageProgress.totalTasks.completed : completedThisMonth
    const tasksTotalThisMonth = packageProgress ? packageProgress.totalTasks.total : 0
    const tasksSubtitle = packageProgress
      ? `${tasksCompletedThisMonth} of ${tasksTotalThisMonth} used this month`
      : "No active package"

    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">Welcome back, {session.user.name || session.user.email || 'User'}</p>
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
                  <p className="text-2xl font-bold">{tasksCompletedThisMonth}</p>
                  <p className="text-xs text-gray-500 mt-1">{tasksSubtitle}</p>
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

            {/* Package Progress Summary */}
            {latestRequest && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Current Package Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Pages:</span>
                        <span className="ml-2 font-medium">{latestRequest.pagesCompleted}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Blogs:</span>
                        <span className="ml-2 font-medium">{latestRequest.blogsCompleted}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">GBP Posts:</span>
                        <span className="ml-2 font-medium">{latestRequest.gbpPostsCompleted}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Improvements:</span>
                        <span className="ml-2 font-medium">{latestRequest.improvementsCompleted}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Package Progress */}
            {packageProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Package Usage - {packageProgress.packageType}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Pages</span>
                        <span>{packageProgress.pages.used} / {packageProgress.pages.limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${packageProgress.pages.percentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Blog Posts</span>
                        <span>{packageProgress.blogs.used} / {packageProgress.blogs.limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${packageProgress.blogs.percentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>GBP Posts</span>
                        <span>{packageProgress.gbpPosts.used} / {packageProgress.gbpPosts.limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${packageProgress.gbpPosts.percentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Improvements</span>
                        <span>{packageProgress.improvements.used} / {packageProgress.improvements.limit}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${packageProgress.improvements.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/requests/new" passHref>
                  <Button className="w-full justify-between">
                    Create New Request <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/requests" passHref>
                  <Button variant="secondary" className="w-full justify-between">
                    View All Requests <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/reporting" passHref>
                  <Button variant="outline" className="w-full justify-between">
                    View Reports <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error("Dashboard: Error fetching data", error)
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">Welcome back, {session.user.name || session.user.email || 'User'}</p>
            </div>
            
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Requests</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Tasks Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-gray-500 mt-1">No active package</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </CardContent>
              </Card>
            </div>

            {/* Package Progress Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Current Package Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Pages:</span>
                      <span className="ml-2 font-medium">0</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Blogs:</span>
                      <span className="ml-2 font-medium">0</span>
                    </div>
                    <div>
                      <span className="text-gray-600">GBP Posts:</span>
                      <span className="ml-2 font-medium">0</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Improvements:</span>
                      <span className="ml-2 font-medium">0</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Package Usage - No Package</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Pages</span>
                      <span>0 / 0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Blog Posts</span>
                      <span>0 / 0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>GBP Posts</span>
                      <span>0 / 0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Improvements</span>
                      <span>0 / 0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/requests/new" passHref>
                  <Button className="w-full justify-between">
                    Create New Request <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/requests" passHref>
                  <Button variant="secondary" className="w-full justify-between">
                    View All Requests <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/reporting" passHref>
                  <Button variant="outline" className="w-full justify-between">
                    View Reports <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </ErrorBoundary>
    )
  }
}