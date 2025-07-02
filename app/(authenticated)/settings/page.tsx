'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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

interface ApiKeyInfo {
  apiKey: string | null
  apiKeyCreatedAt: string | null
  hasApiKey: boolean
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
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // State for different sections
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null)
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null)
  const [packageUsage, setPackageUsage] = useState<PackageUsage | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

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
              setProfile(data.user)
            }
            break
            
          case 'notifications':
            const notifRes = await fetch('/api/settings/notifications')
            if (notifRes.ok) {
              const data = await notifRes.json()
              setNotifications(data.preferences)
            }
            break
            
          case 'api':
            const apiRes = await fetch('/api/settings/api-key')
            if (apiRes.ok) {
              const data = await apiRes.json()
              setApiKeyInfo(data)
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

  // Generate API key
  const generateApiKey = async () => {
    if (!confirm('Are you sure you want to generate a new API key? This will invalidate your existing key.')) {
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmRegenerate: true })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setNewApiKey(data.apiKey)
        setShowApiKey(true)
        setApiKeyInfo({
          apiKey: data.apiKey,
          apiKeyCreatedAt: data.apiKeyCreatedAt,
          hasApiKey: true
        })
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: 'Failed to generate API key' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate API key' })
    } finally {
      setSaving(false)
    }
  }

  // Delete API key
  const deleteApiKey = async () => {
    if (!confirm('Are you sure you want to delete your API key? This action cannot be undone.')) {
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setApiKeyInfo({
          apiKey: null,
          apiKeyCreatedAt: null,
          hasApiKey: false
        })
        setNewApiKey(null)
        setShowApiKey(false)
        setMessage({ type: 'success', text: 'API key deleted successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to delete API key' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete API key' })
    } finally {
      setSaving(false)
    }
  }

  // Copy API key to clipboard
  const copyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey)
      setMessage({ type: 'success', text: 'API key copied to clipboard' })
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
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
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
            <CardContent className="space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : notifications && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, emailNotifications: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="request-created">Request Created</Label>
                      <p className="text-sm text-gray-600">Get notified when new requests are created</p>
                    </div>
                    <Switch
                      id="request-created"
                      checked={notifications.requestCreated}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, requestCreated: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="status-changed">Status Updates</Label>
                      <p className="text-sm text-gray-600">Get notified when request status changes</p>
                    </div>
                    <Switch
                      id="status-changed"
                      checked={notifications.statusChanged}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, statusChanged: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="task-completed">Task Completions</Label>
                      <p className="text-sm text-gray-600">Get notified when tasks are completed</p>
                    </div>
                    <Switch
                      id="task-completed"
                      checked={notifications.taskCompleted}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, taskCompleted: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="weekly-summary">Weekly Summary</Label>
                      <p className="text-sm text-gray-600">Receive weekly summary reports</p>
                    </div>
                    <Switch
                      id="weekly-summary"
                      checked={notifications.weeklySummary}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, weeklySummary: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketing-emails">Marketing Emails</Label>
                      <p className="text-sm text-gray-600">Receive product updates and announcements</p>
                    </div>
                    <Switch
                      id="marketing-emails"
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, marketingEmails: checked })
                      }
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={saveNotifications} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>Manage your API access credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  {apiKeyInfo?.hasApiKey && !newApiKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700">Current API Key</p>
                        <p className="font-mono text-sm mt-1">{apiKeyInfo.apiKey}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Created on {formatDate(apiKeyInfo.apiKeyCreatedAt)}
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button onClick={generateApiKey} disabled={saving}>
                          Regenerate Key
                        </Button>
                        <Button variant="secondary" onClick={deleteApiKey} disabled={saving}>
                          Delete Key
                        </Button>
                      </div>
                    </div>
                  ) : newApiKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm font-medium text-green-800 mb-2">
                          New API Key Generated Successfully!
                        </p>
                        <p className="text-xs text-green-700 mb-3">
                          Make sure to copy your API key now. You won't be able to see it again!
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-white rounded border text-xs">
                            {showApiKey ? newApiKey : '••••••••••••••••••••••••••••••••'}
                          </code>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? 'Hide' : 'Show'}
                          </Button>
                          <Button size="sm" onClick={copyApiKey}>
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        You don't have an API key yet. Generate one to access the API.
                      </p>
                      <Button onClick={generateApiKey} disabled={saving}>
                        Generate API Key
                      </Button>
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900">API Documentation</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Use your API key in the Authorization header:
                    </p>
                    <code className="block mt-2 p-2 bg-blue-100 rounded text-xs">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
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
              ) : integrations && (
                <>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
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
                      <Button
                        variant={integrations.ga4.connected ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => router.push('/api/ga4/auth/connect')}
                      >
                        {integrations.ga4.connected ? 'Reconnect' : 'Connect'}
                      </Button>
                    </div>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Package Usage</CardTitle>
              <CardDescription>
                Your SEO package usage for {packageUsage?.currentMonth?.month || 'Current Month'} {packageUsage?.currentMonth?.year || new Date().getFullYear()}
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