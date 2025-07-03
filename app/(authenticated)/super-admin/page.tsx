'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Building2, 
  FileText, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface SystemStats {
  totalUsers: number
  totalAgencies: number
  totalRequests: number
  activeUsers: number
  pendingRequests: number
  completedRequests: number
  systemHealth: 'healthy' | 'warning' | 'error'
  recentActivity: Array<{
    id: string
    type: 'user_created' | 'agency_created' | 'request_completed'
    description: string
    timestamp: string
  }>
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSystemStats()
  }, [])

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/super-admin/system/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        setError('Failed to fetch system statistics')
      }
    } catch (error) {
      console.error('Error fetching system stats:', error)
      setError('Failed to fetch system statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchSystemStats}>Retry</Button>
      </div>
    )
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Warning</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_created':
        return <Users className="h-4 w-4 text-blue-500" />
      case 'agency_created':
        return <Building2 className="h-4 w-4 text-green-500" />
      case 'request_completed':
        return <CheckCircle className="h-4 w-4 text-purple-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">System overview and management</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">System Status:</span>
          {stats && getHealthBadge(stats.systemHealth)}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers || 0} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAgencies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all regions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingRequests || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRequests ? Math.round((stats.completedRequests / stats.totalRequests) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedRequests || 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/super-admin/users">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
            </Link>
            <Link href="/super-admin/agencies">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <Building2 className="h-6 w-6" />
                <span>Manage Agencies</span>
              </Button>
            </Link>
            <Link href="/super-admin/system">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <BarChart3 className="h-6 w-6" />
                <span>System Settings</span>
              </Button>
            </Link>
            <Link href="/super-admin/audit">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <FileText className="h-6 w-6" />
                <span>Audit Logs</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest events across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}