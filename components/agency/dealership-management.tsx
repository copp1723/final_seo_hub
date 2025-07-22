'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Settings, 
  Package, 
  Bell, 
  Users, 
  Calendar,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Globe,
  Save,
  RefreshCw,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Info,
  Edit2
} from 'lucide-react'

interface DealershipUser {
  id: string
  name: string | null
  email: string
  role: string
  preferences: {
    emailNotifications: boolean
    requestCreated: boolean
    statusChanged: boolean
    taskCompleted: boolean
    weeklySummary: boolean
    marketingEmails: boolean
    timezone?: string
    language?: string
  } | null
}

interface DealershipData {
  id: string
  name: string
  website?: string
  address?: string
  phone?: string
  activePackageType?: 'SILVER' | 'GOLD' | 'PLATINUM' | null
  currentBillingPeriodStart?: string | null
  currentBillingPeriodEnd?: string | null
  pagesUsedThisPeriod: number
  blogsUsedThisPeriod: number
  gbpPostsUsedThisPeriod: number
  improvementsUsedThisPeriod: number
  userCount: number
  createdAt: string
  users: DealershipUser[]
}

interface PackageLimits {
  pages: number
  blogs: number
  gbpPosts: number
  improvements: number
}

const PACKAGE_LIMITS: Record<string, PackageLimits> = {
  SILVER: { pages: 3, blogs: 4, gbpPosts: 8, improvements: 8 },
  GOLD: { pages: 6, blogs: 8, gbpPosts: 16, improvements: 10 },
  PLATINUM: { pages: 9, blogs: 12, gbpPosts: 20, improvements: 20 }
}

export function DealershipManagement() {
  const [dealerships, setDealerships] = useState<DealershipData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [packageFilter, setPackageFilter] = useState<string>('all')
  const [selectedDealership, setSelectedDealership] = useState<DealershipData | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    activePackageType: '',
    emailNotifications: true,
    requestCreated: true,
    statusChanged: true,
    taskCompleted: true,
    weeklySummary: true,
    marketingEmails: false,
    timezone: 'America/New_York',
    language: 'en'
  })

  useEffect(() => {
    fetchDealerships()
  }, [])

  const fetchDealerships = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/agency/dealerships')
      if (response.ok) {
        const data = await response.json()
        setDealerships(data.dealerships || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load dealerships' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load dealerships' })
    } finally {
      setLoading(false)
    }
  }

  const openSettingsModal = (dealership: DealershipData) => {
    setSelectedDealership(dealership)
    
    // Get the most common preferences from users (or defaults)
    const hasUsers = dealership.users.length > 0
    const firstUserPrefs = dealership.users[0]?.preferences
    
    setSettingsForm({
      activePackageType: dealership.activePackageType || 'SILVER',
      emailNotifications: firstUserPrefs?.emailNotifications ?? true,
      requestCreated: firstUserPrefs?.requestCreated ?? true,
      statusChanged: firstUserPrefs?.statusChanged ?? true,
      taskCompleted: firstUserPrefs?.taskCompleted ?? true,
      weeklySummary: firstUserPrefs?.weeklySummary ?? true,
      marketingEmails: firstUserPrefs?.marketingEmails ?? false,
      timezone: firstUserPrefs?.timezone || 'America/New_York',
      language: firstUserPrefs?.language || 'en'
    })
    
    setShowSettingsModal(true)
  }

  const saveSettings = async () => {
    if (!selectedDealership) return
    
    setSaving(selectedDealership.id)
    setMessage(null)

    try {
      const response = await fetch('/api/agency/dealerships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealershipId: selectedDealership.id,
          activePackageType: settingsForm.activePackageType,
          settings: {
            emailNotifications: settingsForm.emailNotifications,
            requestCreated: settingsForm.requestCreated,
            statusChanged: settingsForm.statusChanged,
            taskCompleted: settingsForm.taskCompleted,
            weeklySummary: settingsForm.weeklySummary,
            marketingEmails: settingsForm.marketingEmails,
            timezone: settingsForm.timezone,
            language: settingsForm.language
          }
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings updated successfully' })
        setShowSettingsModal(false)
        fetchDealerships() // Refresh the list
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings' })
    } finally {
      setSaving(null)
    }
  }

  const filteredDealerships = dealerships.filter(dealership => {
    const matchesSearch = dealership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dealership.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dealership.address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPackage = packageFilter === 'all' || dealership.activePackageType === packageFilter
    
    return matchesSearch && matchesPackage
  })

  const getPackageProgress = (dealership: DealershipData) => {
    if (!dealership.activePackageType) return null
    
    const limits = PACKAGE_LIMITS[dealership.activePackageType]
    return {
      pages: { used: dealership.pagesUsedThisPeriod, total: limits.pages },
      blogs: { used: dealership.blogsUsedThisPeriod, total: limits.blogs },
      gbpPosts: { used: dealership.gbpPostsUsedThisPeriod, total: limits.gbpPosts },
      improvements: { used: dealership.improvementsUsedThisPeriod, total: limits.improvements }
    }
  }

  const getProgressPercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-orange-600 bg-orange-100'
    return 'text-green-600 bg-green-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading dealerships...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dealership Management</h2>
          <p className="text-muted-foreground">
            Manage packages, settings, and notifications for your dealership clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {dealerships.length} dealerships
          </Badge>
          <Button variant="outline" onClick={fetchDealerships}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Dealerships</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, website, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="package-filter">Package Filter</Label>
              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="PLATINUM">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dealerships Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDealerships.map((dealership) => {
          const progress = getPackageProgress(dealership)
          
          return (
            <Card key={dealership.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{dealership.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {dealership.activePackageType && (
                        <Badge variant="outline" className="text-xs">
                          {dealership.activePackageType}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {dealership.userCount} users
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openSettingsModal(dealership)}
                    className="ml-2"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  {dealership.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="truncate">{dealership.website}</span>
                    </div>
                  )}
                  {dealership.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{dealership.phone}</span>
                    </div>
                  )}
                  {dealership.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{dealership.address}</span>
                    </div>
                  )}
                </div>

                {/* Package Progress */}
                {progress && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Monthly Usage</span>
                        <span className="text-muted-foreground">
                          {dealership.currentBillingPeriodEnd && 
                            `Ends ${new Date(dealership.currentBillingPeriodEnd).toLocaleDateString()}`
                          }
                        </span>
                      </div>
                      
                      {Object.entries(progress).map(([type, { used, total }]) => {
                        const percentage = getProgressPercentage(used, total)
                        const colorClass = getProgressColor(percentage)
                        
                        return (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{type.replace('gbpPosts', 'GBP Posts')}:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{used}/{total}</span>
                              <div className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                                {percentage}%
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Users Summary */}
                {dealership.users.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <div className="text-sm">
                      <div className="font-medium mb-1">Users</div>
                      {dealership.users.slice(0, 2).map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <span className="text-muted-foreground truncate">
                            {user.name || user.email}
                          </span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                      {dealership.users.length > 2 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          +{dealership.users.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredDealerships.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No dealerships found</h3>
            <p className="text-gray-600">
              {searchTerm || packageFilter !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by adding your first dealership.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {selectedDealership?.name} Settings
            </DialogTitle>
            <DialogDescription>
              Manage package type and notification preferences for this dealership
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="package" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="package" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Package
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="package" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Package Configuration</CardTitle>
                  <CardDescription>
                    Choose the SEO package for this dealership
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="package-type">Package Type</Label>
                    <Select 
                      value={settingsForm.activePackageType} 
                      onValueChange={(value) => setSettingsForm({ ...settingsForm, activePackageType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SILVER">
                          <div className="flex flex-col">
                            <span className="font-medium">Silver Package</span>
                            <span className="text-xs text-muted-foreground">
                              3 pages, 4 blogs, 8 GBP posts, 8 improvements/month
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="GOLD">
                          <div className="flex flex-col">
                            <span className="font-medium">Gold Package</span>
                            <span className="text-xs text-muted-foreground">
                              6 pages, 8 blogs, 16 GBP posts, 10 improvements/month
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="PLATINUM">
                          <div className="flex flex-col">
                            <span className="font-medium">Platinum Package</span>
                            <span className="text-xs text-muted-foreground">
                              9 pages, 12 blogs, 20 GBP posts, 20 improvements/month
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changing the package will reset usage counters and start a new billing period
                    </p>
                  </div>

                  {selectedDealership && getPackageProgress(selectedDealership) && (
                    <div className="space-y-3">
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Current Usage</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(getPackageProgress(selectedDealership)!).map(([type, { used, total }]) => {
                            const percentage = getProgressPercentage(used, total)
                            
                            return (
                              <div key={type} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="capitalize">{type.replace('gbpPosts', 'GBP Posts')}</span>
                                  <span>{used}/{total}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      percentage >= 90 ? 'bg-red-500' :
                                      percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <CardDescription>
                    Configure email notifications for all users in this dealership
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <Label className="text-base font-semibold">Email Notifications</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Master control for all email notifications
                      </p>
                    </div>
                    <Switch
                      checked={settingsForm.emailNotifications}
                      onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, emailNotifications: checked })}
                    />
                  </div>

                  {/* Individual Preferences */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Request Created</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when new SEO requests are created
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.requestCreated && settingsForm.emailNotifications}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, requestCreated: checked })}
                        disabled={!settingsForm.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Status Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when request status changes
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.statusChanged && settingsForm.emailNotifications}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, statusChanged: checked })}
                        disabled={!settingsForm.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Content Completion</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when content is published (pages, blogs, GBP posts)
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.taskCompleted && settingsForm.emailNotifications}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, taskCompleted: checked })}
                        disabled={!settingsForm.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Weekly Summary</Label>
                        <p className="text-sm text-muted-foreground">
                          Weekly progress reports
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.weeklySummary && settingsForm.emailNotifications}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, weeklySummary: checked })}
                        disabled={!settingsForm.emailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">
                          Product updates and announcements
                        </p>
                      </div>
                      <Switch
                        checked={settingsForm.marketingEmails && settingsForm.emailNotifications}
                        onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, marketingEmails: checked })}
                        disabled={!settingsForm.emailNotifications}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Timezone and Language */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Timezone</Label>
                      <Select 
                        value={settingsForm.timezone} 
                        onValueChange={(value) => setSettingsForm({ ...settingsForm, timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Select 
                        value={settingsForm.language} 
                        onValueChange={(value) => setSettingsForm({ ...settingsForm, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedDealership && selectedDealership.users.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        These settings will be applied to all {selectedDealership.users.length} users in this dealership. 
                        Individual users can still modify their own preferences.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={!!saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 