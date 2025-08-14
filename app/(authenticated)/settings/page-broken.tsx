'use client'

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { NotificationPreferencesComponent } from '@/components/settings/notification-preferences'
import { useAuth } from '@/app/simple-auth-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Building2, Shield } from 'lucide-react'

// Lazy load super admin components only when needed
const UsersManagement = lazy(() => import('@/app/(authenticated)/super-admin/users/page'))
const AgenciesManagement = lazy(() => import('@/app/(authenticated)/super-admin/agencies/page'))

interface ProfileData {
  name: string
  email: string
  image: string | null
  role: string
  createdAt: string
}

interface NotificationPreferences {
  emailNotifications: boolean
  requestCreated: boolean
  statusChanged: boolean
  taskCompleted: boolean
  weeklySummary: boolean
  marketingEmails: boolean
}

interface IntegrationStatus {
  ga4: {
    connected: boolean
    propertyName: string | null
    connectedAt: string | null
  }
  searchConsole: {
    connected: boolean
    siteName: string | null
    connectedAt: string | null
  }
}

interface PackageUsage {
  currentPackage: string | null
  packageUsage: Record<string, any>
  currentMonth: {
    month: string
    year: number
  }
}

export default function UnifiedSettingsPage() {
  const { user, refreshSession } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get tab from URL or default
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'profile')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // State for different sections
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null)
  const [packageUsage, setPackageUsage] = useState<PackageUsage | null>(null)
  const [showPropertySelector, setShowPropertySelector] = useState(false)
  const [newPropertyId, setNewPropertyId] = useState('')
  const [newPropertyName, setNewPropertyName] = useState('')

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAgencyAdmin = user?.role === 'AGENCY_ADMIN'

  // Handle URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('tab', value)
    window.history.pushState({}, '', newUrl.toString())
  }

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const error = searchParams.get('error')
    const success = searchParams.get('success')

    if (error) {
      let errorMessage = 'An error occurred'

      switch (error) {
        case 'search_console_denied':
          errorMessage = 'Search Console access was denied. Please try again and grant permissions.'
          break
        case 'no_search_console_sites':
          errorMessage = 'No Search Console properties found. Please verify a website in Google Search Console first.'
          break
        case 'insufficient_search_console_permissions':
          errorMessage = 'Insufficient permissions for Search Console. You need "Full User" or "Owner" access to the property.'
          break
        case 'search_console_invalid_grant':
          errorMessage = 'Search Console authorization expired. Please reconnect.'
          break
        default:
          errorMessage = `Error: ${error.replace(/_/g, ' ')}`
      }

      setMessage({ type: 'error', text: errorMessage })
      setActiveTab('integrations')
    }

    if (success) {
      let successMessage = 'Operation completed successfully'

      switch (success) {
        case 'search_console_connected':
          successMessage = 'Search Console connected successfully!'
          break
        default:
          successMessage = success.replace(/_/g, ' ')
      }

      setMessage({ type: 'success', text: successMessage })
      setActiveTab('integrations')
    }

    // Clear URL parameters after showing message
    if (error || success) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('success')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  // Fetch data based on active tab
  useEffect(() => {
    // Skip fetching for super admin tabs as they handle their own data
    if (['users', 'agencies'].includes(activeTab)) {
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setMessage(null)
      
      try {
        switch (activeTab) {
          case 'profile':
            const profileRes = await fetch('/api/settings/profile', { credentials: 'include' })
            if (profileRes.ok) {
              const data = await profileRes.json()
              const user = data.data?.users || data.user
              setProfile(user)
            } else {
              setMessage({ type: 'error', text: 'Failed to load profile data' })
            }
            break
            
          case 'notifications':
            const notifRes = await fetch('/api/settings/notifications', { credentials: 'include' })
            
            if (notifRes.ok) {
              const data = await notifRes.json()
              const preferences = data.data?.preferences || data.preferences
              setNotifications(preferences)
            } else {
              const errorData = await notifRes.text()
              setMessage({ type: 'error', text: `Failed to load notifications: ${notifRes.status}` })
            }
            break
            
          case 'integrations':
            const intRes = await fetch('/api/settings/integrations', { credentials: 'include' })
            if (intRes.ok) {
              const data = await intRes.json()
              const integrationsData = data.data?.integrations || data.integrations
              setIntegrations(integrationsData)
            }
            break
            
          case 'usage':
            try {
              const usageRes = await fetch('/api/settings/usage', { credentials: 'include' })
              if (usageRes.ok) {
                const data = await usageRes.json()
                setPackageUsage(data)
              } else {
                setMessage({ type: 'error', text: 'Failed to load usage data' })
              }
            } catch (error) {
              setMessage({ type: 'error', text: 'Failed to load usage data' })
            }
            break
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to load settings' })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [activeTab])

  const saveProfile = async () => {
    if (!profile) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name,
        }),
        credentials: 'include'
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' })
        await refreshSession()
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  // Determine grid columns based on user role
  const gridCols = isSuperAdmin ? 'grid-cols-6' : 'grid-cols-4'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className={`grid ${gridCols} w-full bg-gray-100/80 p-1 rounded-xl`}>
          <TabsTrigger value="profile" className="rounded-lg font-medium">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg font-medium">Notifications</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg font-medium">Integrations</TabsTrigger>
          <TabsTrigger value="usage" className="rounded-lg font-medium">Usage</TabsTrigger>
          
          {/* Super Admin Only Tabs */}
          {isSuperAdmin && (
            <>
              <TabsTrigger value="users" className="rounded-lg font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                Users
              </TabsTrigger>
              <TabsTrigger value="agencies" className="rounded-lg font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Agencies
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : profile && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Enter your name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Badge variant="secondary" className="text-sm">
                      {profile.role}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button onClick={saveProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationPreferencesComponent
            preferences={notifications}
            onUpdate={setNotifications}
            saving={saving}
          />
        </TabsContent>

        {/* Integrations Tab - Same as original */}
        <TabsContent value="integrations" className="space-y-4">
          {/* Copy existing integrations content */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add existing integrations content here */}
              <p className="text-gray-600">GA4 and Search Console integrations</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab - Same as original */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>View your usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add existing usage content here */}
              <p className="text-gray-600">Package usage information</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Super Admin: Users Tab */}
        {isSuperAdmin && (
          <TabsContent value="users" className="space-y-4">
            <Card className="border-0 shadow-none p-0">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-96" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                </div>
              }>
                <UsersManagement />
              </Suspense>
            </Card>
          </TabsContent>
        )}

        {/* Super Admin: Agencies Tab */}
        {isSuperAdmin && (
          <TabsContent value="agencies" className="space-y-4">
            <Card className="border-0 shadow-none p-0">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-96" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                </div>
              }>
                <AgenciesManagement />
              </Suspense>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}