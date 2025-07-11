'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { NotificationPreferencesComponent } from '@/components/settings/notification-preferences'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

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

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('profile')
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
      setActiveTab('integrations') // Switch to integrations tab to show the error
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
      setActiveTab('integrations') // Switch to integrations tab to show the success
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
    const fetchData = async () => {
      setLoading(true)
      setMessage(null)
      
      try {
        switch (activeTab) {
          case 'profile':
            const profileRes = await fetch('/api/settings/profile')
            if (profileRes.ok) {
              const data = await profileRes.json()
              // Fix: Extract user from the correct API response structure
              const user = data.data?.user || data.user
              setProfile(user)
            } else {
              setMessage({ type: 'error', text: 'Failed to load profile data' })
            }
            break
            
          case 'notifications':
            const notifRes = await fetch('/api/settings/notifications')
            
            if (notifRes.ok) {
              const data = await notifRes.json()
              // Fix: Extract preferences from the correct API response structure
              const preferences = data.data?.preferences || data.preferences
              setNotifications(preferences)
            } else {
              const errorData = await notifRes.text()
              setMessage({ type: 'error', text: `Failed to load notifications: ${notifRes.status}` })
            }
            break
            
            
          case 'integrations':
            const intRes = await fetch('/api/settings/integrations')
            if (intRes.ok) {
              const data = await intRes.json()
              console.log('Integrations API response:', data)
              const integrationsData = data.data?.integrations || data.integrations
              console.log('Setting integrations data:', integrationsData)
              setIntegrations(integrationsData)
            }
            break
            
          case 'usage':
            try {
              const usageRes = await fetch('/api/settings/usage')
              if (usageRes.ok) {
                const data = await usageRes.json()
                console.log('Usage API response:', data)
                console.log('Current month data:', data?.currentMonth)
                setPackageUsage(data)
              } else {
                console.error('Usage API failed:', usageRes.status, await usageRes.text())
                setMessage({ type: 'error', text: 'Failed to load usage data' })
              }
            } catch (error) {
              console.error('Usage API error:', error)
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

  // Save profile
  const saveProfile = async () => {
    if (!profile) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' })
        // Update session if email changed
        if (profile.email !== session?.user?.email) {
          await update()
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  // Save notifications
  const saveNotifications = async () => {
    if (!notifications) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications)
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save preferences' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    } finally {
      setSaving(false)
    }
  }


  // Update GA4 property
  const handleUpdateProperty = async () => {
    if (!newPropertyId) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/ga4/set-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: newPropertyId,
          propertyName: newPropertyName || `Property ${newPropertyId}`
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        // Update the integrations state
        setIntegrations(prev => prev ? {
          ...prev,
          ga4: {
            ...prev.ga4,
            propertyName: data.propertyName
          }
        } : null)
        
        setMessage({ type: 'success', text: 'GA4 property updated successfully' })
        setShowPropertySelector(false)
        setNewPropertyId('')
        setNewPropertyName('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update property' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update property' })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="usage">Monthly Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : profile && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <div className="flex items-center">
                      <Badge variant="default">{profile.role}</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <p className="text-sm text-gray-600">{formatDate(profile.createdAt)}</p>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={saveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive updates</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <NotificationPreferencesComponent
                    preferences={notifications}
                    onUpdate={setNotifications}
                    saving={saving}
                  />
                  
                  <div className="pt-6 border-t">
                    <Button onClick={saveNotifications} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Integrations</CardTitle>
              <CardDescription>Manage your third-party service connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ) : (
                session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'AGENCY_ADMIN' ? (
                  integrations && (
                    <>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">Google Analytics 4</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {integrations.ga4.connected 
                                ? `Connected to ${integrations.ga4.propertyName || 'GA4 Property'}`
                                : 'Not connected'
                              }
                            </p>
                            {integrations.ga4.connected && (
                              <p className="text-xs text-gray-500 mt-1">
                                Connected on {formatDate(integrations.ga4.connectedAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {integrations.ga4.connected && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPropertySelector(!showPropertySelector)}
                              >
                                Change Property
                              </Button>
                            )}
                            <Button
                              variant={integrations.ga4.connected ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => router.push('/api/ga4/auth/connect')}
                            >
                              {integrations.ga4.connected ? 'Reconnect' : 'Connect'}
                            </Button>
                          </div>
                        </div>
                        {/* Property Selector */}
                        {integrations.ga4.connected && showPropertySelector && (
                          <div className="mt-4 p-4 bg-gray-50 rounded border">
                            <h5 className="font-medium mb-3">Select GA4 Property</h5>
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="propertyId">Property ID</Label>
                                <Input
                                  id="propertyId"
                                  type="text"
                                  placeholder="e.g., 320759942"
                                  value={newPropertyId}
                                  onChange={(e) => setNewPropertyId(e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="propertyName">Property Name (Optional)</Label>
                                <Input
                                  id="propertyName"
                                  type="text"
                                  placeholder="e.g., Jay Hatfield Chevrolet"
                                  value={newPropertyName}
                                  onChange={(e) => setNewPropertyName(e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={handleUpdateProperty}
                                  disabled={!newPropertyId || saving}
                                >
                                  {saving ? 'Updating...' : 'Update Property'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setShowPropertySelector(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500">
                                <p className="font-medium mb-1">Available Properties:</p>
                                <p>• Jay Hatfield Chevrolet: 320759942</p>
                                <p>• Jay Hatfield Motorsports: 317592148</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Google Search Console</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {integrations.searchConsole.connected 
                                ? `Connected to ${integrations.searchConsole.siteName || 'Search Console'}`
                                : 'Not connected'
                              }
                            </p>
                            {integrations.searchConsole.connected && (
                              <p className="text-xs text-gray-500 mt-1">
                                Connected on {formatDate(integrations.searchConsole.connectedAt)}
                              </p>
                            )}
                          </div>
                          <Button
                            variant={integrations.searchConsole.connected ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => router.push('/api/search-console/connect')}
                          >
                            {integrations.searchConsole.connected ? 'Reconnect' : 'Connect'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <div className="p-4 text-gray-500 text-center">
                    You do not have permission to manage integrations. Please contact your agency admin or super admin.
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Package Usage</CardTitle>
              <CardDescription>
                Track your SEO request usage for {packageUsage?.currentMonth?.month || 'Current Month'} {packageUsage?.currentMonth?.year || new Date().getFullYear()} - monitor pages, blogs, and GBP posts remaining in your package
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ) : packageUsage && packageUsage.currentPackage && packageUsage.packageUsage ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Current Package:</span>
                    <Badge>{packageUsage.currentPackage}</Badge>
                  </div>
                  
                  {Object.entries(packageUsage.packageUsage).map(([pkgType, usage]: [string, any]) => (
                    <div key={pkgType} className="space-y-3">
                      <h4 className="font-medium text-sm">{usage.package.name} Package</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Progress</span>
                          <span>{usage.percentageUsed}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${usage.percentageUsed}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-2xl font-bold">{usage.usage.pages.used}</p>
                          <p className="text-xs text-gray-600">of {usage.usage.pages.total} Pages</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-2xl font-bold">{usage.usage.blogs.used}</p>
                          <p className="text-xs text-gray-600">of {usage.usage.blogs.total} Blogs</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <p className="text-2xl font-bold">{usage.usage.gbpPosts.used}</p>
                          <p className="text-xs text-gray-600">of {usage.usage.gbpPosts.total} GBP Posts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No package information available. Submit a request to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}