'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { 
  Settings, 
  Database, 
  Shield, 
  Globe, 
  Mail,
  Bell,
  Zap,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading'

interface SystemSettings {
  // Feature flags
  maintenanceMode: boolean
  newUserRegistration: boolean
  emailNotifications: boolean
  auditLogging: boolean
  
  // Limits and quotas
  maxUsersPerAgency: number
  maxRequestsPerUser: number
  maxFileUploadSize: number
  
  // Email settings
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpFromEmail: string
  
  // System messages
  maintenanceMessage: string
  welcomeMessage: string
  
  // API settings
  rateLimitPerMinute: number
  sessionTimeoutMinutes: number
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  email: 'healthy' | 'warning' | 'error'
  storage: 'healthy' | 'warning' | 'error'
  api: 'healthy' | 'warning' | 'error'
  lastChecked: string
}

export default function SuperAdminSystemPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'security' | 'health'>('general')

  useEffect(() => {
    fetchSystemSettings()
    fetchSystemHealth()
  }, [])

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/super-admin/system/settings')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch system settings')
      }
      const data = await response.json()
      setSettings(data.settings)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching system settings.'
      setError(errorMessage)
      toast(errorMessage, 'error')
    }
  }

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/super-admin/system/health')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch system health')
      }
      const data = await response.json()
      setHealth(data.health)
    } catch (err) {
      console.error('Error fetching system health:', err)
      // Don't show error toast for health check failures
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    if (!settings) return
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/super-admin/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save system settings')
      }
      
      toast('System settings saved successfully.', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while saving settings.'
      toast(errorMessage, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const getHealthIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getHealthColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 bg-red-100 p-4 rounded-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="mr-3 h-8 w-8" />
            System Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage global system configuration and monitoring</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving || !settings}>
          {isSaving ? (
            <LoadingSpinner className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'health', label: 'System Health', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Feature Flags
              </CardTitle>
              <CardDescription>Control system-wide features and functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Maintenance Mode</label>
                  <p className="text-xs text-gray-500">Temporarily disable user access</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">New User Registration</label>
                  <p className="text-xs text-gray-500">Allow new users to register</p>
                </div>
                <Switch
                  checked={settings.newUserRegistration}
                  onCheckedChange={(checked) => handleSettingChange('newUserRegistration', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Email Notifications</label>
                  <p className="text-xs text-gray-500">Send system notifications via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Audit Logging</label>
                  <p className="text-xs text-gray-500">Log all user actions for compliance</p>
                </div>
                <Switch
                  checked={settings.auditLogging}
                  onCheckedChange={(checked) => handleSettingChange('auditLogging', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                System Limits
              </CardTitle>
              <CardDescription>Configure usage limits and quotas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Max Users per Agency</label>
                <Input
                  type="number"
                  value={settings.maxUsersPerAgency}
                  onChange={(e) => handleSettingChange('maxUsersPerAgency', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Requests per User (monthly)</label>
                <Input
                  type="number"
                  value={settings.maxRequestsPerUser}
                  onChange={(e) => handleSettingChange('maxRequestsPerUser', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max File Upload Size (MB)</label>
                <Input
                  type="number"
                  value={settings.maxFileUploadSize}
                  onChange={(e) => handleSettingChange('maxFileUploadSize', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rate Limit (requests per minute)</label>
                <Input
                  type="number"
                  value={settings.rateLimitPerMinute}
                  onChange={(e) => handleSettingChange('rateLimitPerMinute', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>System Messages</CardTitle>
              <CardDescription>Configure messages displayed to users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Maintenance Message</label>
                <Textarea
                  value={settings.maintenanceMessage}
                  onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                  placeholder="Message shown when maintenance mode is enabled"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Welcome Message</label>
                <Textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                  placeholder="Message shown to new users"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Email Settings */}
      {activeTab === 'email' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>Configure email server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">SMTP Host</label>
                <Input
                  value={settings.smtpHost}
                  onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                  placeholder="smtp.example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">SMTP Port</label>
                <Input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
                  placeholder="587"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">SMTP Username</label>
                <Input
                  value={settings.smtpUser}
                  onChange={(e) => handleSettingChange('smtpUser', e.target.value)}
                  placeholder="username@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">From Email Address</label>
                <Input
                  value={settings.smtpFromEmail}
                  onChange={(e) => handleSettingChange('smtpFromEmail', e.target.value)}
                  placeholder="noreply@example.com"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Security Settings */}
      {activeTab === 'security' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Configuration
              </CardTitle>
              <CardDescription>Configure security and session settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session Timeout (minutes)</label>
                <Input
                  type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => handleSettingChange('sessionTimeoutMinutes', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">How long users stay logged in</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* System Health */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                System Health Status
              </CardTitle>
              <CardDescription>
                Monitor the health of system components
                {health && (
                  <span className="block text-xs mt-1">
                    Last checked: {new Date(health.lastChecked).toLocaleString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {health ? (
                <div className="space-y-4">
                  {[
                    { key: 'database', label: 'Database', icon: Database },
                    { key: 'email', label: 'Email Service', icon: Mail },
                    { key: 'storage', label: 'File Storage', icon: Database },
                    { key: 'api', label: 'API Services', icon: Globe }
                  ].map((component) => (
                    <div key={component.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <component.icon className="h-5 w-5 mr-3 text-gray-500" />
                        <span className="font-medium">{component.label}</span>
                      </div>
                      <div className="flex items-center">
                        {getHealthIcon(health[component.key as keyof SystemHealth] as any)}
                        <Badge className={`ml-2 ${getHealthColor(health[component.key as keyof SystemHealth] as any)}`}>
                          {health[component.key as keyof SystemHealth]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Unable to load system health status</p>
                  <Button onClick={fetchSystemHealth} className="mt-2">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
          </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
