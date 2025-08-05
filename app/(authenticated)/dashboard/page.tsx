'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useDealership } from '@/app/context/DealershipContext'
import { redirect } from 'next/navigation'

// Force dynamic rendering - don't pre-render this page
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  RefreshCw,
  Loader2,
  TrendingUp,
  BarChart,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react'

import ErrorBoundary from '@/components/error-boundary'
import { useToast } from '@/hooks/use-toast'
import { RecentActivityTimeline } from '@/components/dashboard/RecentActivityTimeline'
import { DealershipSelector } from '@/components/layout/dealership-selector'

import type { 
  DashboardData, 
  DashboardAnalyticsData as AnalyticsData,
  Activity as ActivityType,
  DashboardRankingsData
} from '@/types/dashboard'

// Simple StatCard component
const StatCard = ({ title, value, subtitle, loading = false }: {
  title: string
  value: string | number
  subtitle: string
  loading?: boolean
}) => {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center mt-2">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple ProgressBar component
const ProgressBar = ({ label, used, limit }: {
  label: string
  used: number
  limit: number
}) => {
  const percentage = Math.min((used / limit) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-600">{used} / {limit}</span>
          <Badge variant="outline" className="text-xs px-1 py-0">
            {Math.round(percentage)}%
          </Badge>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all bg-gradient-to-r from-blue-500 to-indigo-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { currentDealership } = useDealership()
  const { toast } = useToast()

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [rankingsData, setRankingsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [rankingsLoading, setRankingsLoading] = useState(true)

  // Redirect if not authenticated
  if (!isLoading && !user) {
    redirect('/login')
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome back! Here's what's happening with your SEO.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <DealershipSelector />
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in">
            {/* Analytics Metrics */}
            <StatCard
              title="GA4 Sessions"
              value={analyticsData?.ga4Data?.sessions?.toLocaleString() ?? '-'}
              subtitle="Last 30 days"
              loading={analyticsLoading}
            />
            <StatCard
              title="GA4 Users"
              value={analyticsData?.ga4Data?.users?.toLocaleString() ?? '-'}
              subtitle="Last 30 days"
              loading={analyticsLoading}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
            <StatCard
              title="SC Clicks"
              value={analyticsData?.searchConsoleData?.clicks?.toLocaleString() ?? '-'}
              subtitle="Last 30 days"
              loading={analyticsLoading}
            />
            <StatCard
              title="SC Impressions"
              value={analyticsData?.searchConsoleData?.impressions?.toLocaleString() ?? '-'}
              subtitle="Last 30 days"
              loading={analyticsLoading}
            />
            <StatCard
              title="Avg. Ranking"
              value={rankingsData?.data?.averagePosition?.toFixed(0) ?? '-'}
              subtitle="Average search position"
              loading={rankingsLoading}
            />
          </div>

          {/* Keyword Rankings Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Keyword Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats Grid */}
                {rankingsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="text-center p-3 bg-gray-50 rounded-lg animate-pulse">
                        <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100">
                      <div className="text-xl font-bold text-emerald-700">65</div>
                      <div className="text-xs text-gray-500">Top 10 Rankings</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-700">74</div>
                      <div className="text-xs text-gray-500">Top 20 Rankings</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-lg border border-purple-100">
                      <div className="text-xl font-bold text-purple-700">14.2</div>
                      <div className="text-xs text-gray-500">Avg Position</div>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-lg border border-orange-100">
                      <div className="text-xl font-bold text-orange-700">100</div>
                      <div className="text-xs text-gray-500">Total Keywords</div>
                    </div>
                  </div>
                )}

                {/* Keywords List */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Top Performing Keywords</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-50 to-emerald-50/50 rounded text-sm border border-green-100">
                      <span className="font-medium truncate flex-1 mr-2">acura columbus</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0">
                          Position 1
                        </Badge>
                        <span className="text-gray-500 text-xs">1223 clicks</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-50 to-sky-50/50 rounded text-sm border border-blue-100">
                      <span className="font-medium">columbus acura</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs px-1 py-0">Position 2</Badge>
                        <span className="text-gray-500 text-xs">175 clicks</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-50 to-violet-50/50 rounded text-sm border border-purple-100">
                      <span className="font-medium">acura dublin</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs px-1 py-0">Position 1</Badge>
                        <span className="text-gray-500 text-xs">129 clicks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Package Progress */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Package Progress
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {currentDealership?.activePackageType || 'SILVER'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ProgressBar
                      label="Pages Created"
                      used={dashboardData?.packageProgress?.pagesUsed || 2}
                      limit={dashboardData?.packageProgress?.pagesLimit || 5}
                    />
                    <ProgressBar
                      label="Blog Posts"
                      used={dashboardData?.packageProgress?.blogsUsed || 1}
                      limit={dashboardData?.packageProgress?.blogsLimit || 2}
                    />
                    <ProgressBar
                      label="GBP Posts"
                      used={dashboardData?.packageProgress?.gbpPostsUsed || 8}
                      limit={dashboardData?.packageProgress?.gbpPostsLimit || 12}
                    />
                    <ProgressBar
                      label="Improvements"
                      used={dashboardData?.packageProgress?.improvementsUsed || 3}
                      limit={dashboardData?.packageProgress?.improvementsLimit || 5}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          New page created: "Acura Service Center"
                        </p>
                        <p className="text-sm text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Blog post published: "2024 Acura Models"
                        </p>
                        <p className="text-sm text-gray-500">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Keyword ranking improved for "acura columbus"
                        </p>
                        <p className="text-sm text-gray-500">2 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}