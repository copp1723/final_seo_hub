'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, FileText, Settings, PlusCircle, BarChart } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return
    
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN')) {
      router.push('/dashboard')
      return
    }
    
    setLoading(false)
  }, [user, isLoading, router])

  if (isLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN')) {
    return null
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  const isAgencyAdmin = user.role === 'AGENCY_ADMIN'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {isSuperAdmin ? 'System Administration' : 'Agency Management'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isSuperAdmin 
            ? 'Manage the entire SEO Hub platform' 
            : 'Manage your agency and dealerships'
          }
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {isSuperAdmin && (
          <>
            <Link href="/super-admin/agencies">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Manage Agencies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">View and manage all agencies in the system</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/super-admin/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Manage Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">View and manage all users across agencies</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/admin/bulk-create-dealerships">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-purple-600" />
                    Bulk Create Dealerships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Create multiple dealerships from CSV</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/super-admin/system">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-600" />
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Configure system-wide settings</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/super-admin/audit">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    Audit Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">View system activity and audit logs</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
        {isAgencyAdmin && (
          <>
            <Link href={`/admin/agencies/${user.agencyId}/requests`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    All Dealership Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">View requests from all your dealerships</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href={`/admin/agencies/${user.agencyId}/users`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Manage Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Manage users in your agency</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/agency/settings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    Agency Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Configure your agency settings</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>
      
      {/* Getting Started Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isSuperAdmin && (
              <div>
                <h4 className="font-medium mb-2">As a Super Admin, you can:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Create and manage agencies</li>
                  <li>• View all users and their activities</li>
                  <li>• Bulk create dealerships from CSV files</li>
                  <li>• Configure system-wide settings</li>
                  <li>• Monitor system health and audit logs</li>
                </ul>
              </div>
            )}
            {isAgencyAdmin && (
              <div>
                <h4 className="font-medium mb-2">As an Agency Admin, you can:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• View requests from all dealerships in your agency</li>
                  <li>• Manage users within your agency</li>
                  <li>• Configure agency-specific settings</li>
                  <li>• Monitor dealership performance</li>
                </ul>
              </div>
            )}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">
                Need help? Contact support or check the documentation for detailed guides</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
