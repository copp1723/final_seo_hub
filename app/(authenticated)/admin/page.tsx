'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  FileText, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  UserPlus,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/simple-auth-provider'
import { useRouter } from 'next/navigation'

interface AdminStats {
  totalUsers: number
  totalRequests: number
  pendingRequests: number
  completedRequests: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchAdminStats()
  }, [user, router])

  const fetchAdminStats = async () => {
    try {
      // For now, we'll use placeholder data since we don't have the admin stats endpoint yet
      // TODO: Implement admin stats endpoint
      setStats({
        totalUsers: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0
      })
    } catch (error) {
      console.error('Error fetching admin stats:', error)
      setError('Failed to fetch admin statistics')
    } finally {
      setLoading(false)
    }
  }

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN')) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
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
        <Button onClick={fetchAdminStats}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            {user.role === 'SUPER_ADMIN' ? 'System administration' : 'Agency management'}
          </p>
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
              In your {user.role === 'SUPER_ADMIN' ? 'system' : 'agency'}
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
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.agencyId && (
              <Link href={`/admin/agencies/${user.agencyId}/users`}>
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <UserPlus className="h-6 w-6" />
                  <span>Invite Users</span>
                </Button>
              </Link>
            )}
            
            <Link href="/requests">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <FileText className="h-6 w-6" />
                <span>Manage Requests</span>
              </Button>
            </Link>

            {user.role === 'AGENCY_ADMIN' && (
              <Link href="/admin/dealerships">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <Building2 className="h-6 w-6" />
                  <span>Manage Dealerships</span>
                </Button>
              </Link>
            )}

            {user.role === 'SUPER_ADMIN' && (
              <Link href="/super-admin">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                  <Building2 className="h-6 w-6" />
                  <span>Super Admin</span>
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Set up your {user.role === 'SUPER_ADMIN' ? 'system' : 'agency'} for success</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {user.agencyId && (
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Invite team members</p>
                  <p className="text-xs text-gray-500">Add users to your agency</p>
                </div>
                <Link href={`/admin/agencies/${user.agencyId}/users`}>
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Review requests</p>
                <p className="text-xs text-gray-500">Monitor and manage SEO requests</p>
              </div>
              <Link href="/requests">
                <Button size="sm">View Requests</Button>
              </Link>
            </div>

            {user.role === 'SUPER_ADMIN' && (
              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">System administration</p>
                  <p className="text-xs text-gray-500">Manage agencies and system settings</p>
                </div>
                <Link href="/super-admin">
                  <Button size="sm">Super Admin</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
