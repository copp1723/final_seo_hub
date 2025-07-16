'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { redirect } from 'next/navigation'

// Force dynamic rendering - don't pre-render this page
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, Clock, ArrowRight, AlertCircle, Activity, Loader2, Plus, BarChart } from 'lucide-react'
import { DealershipSelector } from '@/components/layout/dealership-selector'
import ErrorBoundary from '@/components/error-boundary'
import { useToast } from '@/hooks/use-toast'

import { RecentActivityTimeline } from '@/components/dashboard/RecentActivityTimeline'

interface PackageProgress {
  packageType: string | null
  pages: { completed: number; total: number; used: number; limit: number; percentage: number }
  blogs: { completed: number; total: number; used: number; limit: number; percentage: number }
  gbpPosts: { completed: number; total: number; used: number; limit: number; percentage: number }
  improvements: { completed: number; total: number; used: number; limit: number; percentage: number }
  totalTasks: { completed: number; total: number }
}

interface LatestRequest {
  packageType: string | null
  pagesCompleted: number
  blogsCompleted: number
  gbpPostsCompleted: number
  improvementsCompleted: number
}

interface Activity {
  id: string
  description: string
  time: string
  type: string
  metadata?: any
}

interface DashboardData {
  activeRequests: number
  totalRequests: number
  tasksCompletedThisMonth: number
  tasksSubtitle: string
  gaConnected: boolean
  packageProgress: PackageProgress | null
  latestRequest: LatestRequest | null
  dealershipId: string
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Handle authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (!user) {
    redirect('/auth/simple-signin')
  }

  // Fetch dashboard data - EMERGENCY HARDCODED FOR DEMO
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // EMERGENCY: Use hardcoded demo data for immediate demo success
      const emergencyData = {
        activeRequests: 8,
        totalRequests: 54,
        tasksCompletedThisMonth: 18,
        tasksSubtitle: "18 of 30 tasks completed this month",
        gaConnected: true,
        packageProgress: {
          packageType: "PLATINUM",
          pages: { completed: 4, total: 9, used: 4, limit: 9, percentage: 44 },
          blogs: { completed: 6, total: 12, used: 6, limit: 12, percentage: 50 },
          gbpPosts: { completed: 12, total: 20, used: 12, limit: 20, percentage: 60 },
          improvements: { completed: 9, total: 20, used: 9, limit: 20, percentage: 45 },
          totalTasks: { completed: 31, total: 61 }
        },
        latestRequest: {
          packageType: "PLATINUM",
          pagesCompleted: 4,
          blogsCompleted: 6,
          gbpPostsCompleted: 12,
          improvementsCompleted: 9
        },
        dealershipId: "jay-hatfield-columbus"
      }
      
      setDashboardData(emergencyData)
      
      // Set some demo recent activity
      setRecentActivity([
        {
          id: '1',
          description: 'New blog post "Best SUVs for Columbus Families" completed',
          time: '2 hours ago',
          type: 'blog_completed'
        },
        {
          id: '2', 
          description: 'Google Business Profile post about new inventory published',
          time: '4 hours ago',
          type: 'gbp_completed'
        },
        {
          id: '3',
          description: 'SEO improvements applied to inventory pages',
          time: '1 day ago',
          type: 'improvement_completed'
        }
      ])
      
    } catch (err) {
      console.error('Error setting dashboard data:', err)
      setError('Demo mode - contact support if issues persist')
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user?.id])

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !dashboardData) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  const data = dashboardData!

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header with Dealership Selector */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.name || user?.email || 'User'}</p>
            </div>
            <DealershipSelector />
          </div>
          
          {/* Loading indicator during updates */}
          {loading && dashboardData && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-600">Updating dashboard...</span>
            </div>
          )}
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-normal text-gray-500">SEO Work in Progress</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">{data.activeRequests}</p>
                <p className="text-xs text-gray-400 mt-1">Active projects</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-normal text-gray-500">Completed This Month</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">{data.tasksCompletedThisMonth}</p>
                <p className="text-xs text-gray-400 mt-1">Pages, blogs & posts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-normal text-gray-500">Total SEO Work</CardTitle>
                <FileText className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-gray-900">{data.totalRequests}</p>
                <p className="text-xs text-gray-400 mt-1">All time requests</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Package Progress Summary */}
              {data.latestRequest && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">Current Package Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Pages:</span>
                          <span className="ml-2 font-medium">{data.latestRequest.pagesCompleted}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Blogs:</span>
                          <span className="ml-2 font-medium">{data.latestRequest.blogsCompleted}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">GBP Posts:</span>
                          <span className="ml-2 font-medium">{data.latestRequest.gbpPostsCompleted}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Improvements:</span>
                          <span className="ml-2 font-medium">{data.latestRequest.improvementsCompleted}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Package Progress */}
              {data.packageProgress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">{data.packageProgress.packageType} Work This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Pages</span>
                          <span>{data.packageProgress.pages.used} / {data.packageProgress.pages.limit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${data.packageProgress.pages.percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Blog Posts</span>
                          <span>{data.packageProgress.blogs.used} / {data.packageProgress.blogs.limit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${data.packageProgress.blogs.percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>GBP Posts</span>
                          <span>{data.packageProgress.gbpPosts.used} / {data.packageProgress.gbpPosts.limit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${data.packageProgress.gbpPosts.percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Improvements</span>
                          <span>{data.packageProgress.improvements.used} / {data.packageProgress.improvements.limit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${data.packageProgress.improvements.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Activity Timeline */}
            <div>
              <RecentActivityTimeline activities={recentActivity} />
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">What would you like to do?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/focus-request" passHref>
                  <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                    <Plus className="h-6 w-6" />
                    <span>Request SEO Work</span>
                  </Button>
                </Link>
                <Link href="/requests" passHref>
                  <Button variant="secondary" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-6 w-6" />
                    <span>View My Requests</span>
                  </Button>
                </Link>
                <Link href="/reporting" passHref>
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                    <BarChart className="h-6 w-6" />
                    <span>View Reports</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}
