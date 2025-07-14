'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building, Globe, Phone, Mail, MapPin, Users, Settings, CreditCard, Shield, Store, PlusCircle, BarChart3, UserPlus, Crown } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { IntegrationPropertyManager } from './integration-property-manager'

interface AgencyProfile {
  id: string
  name: string
  domain?: string
  description?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  businessType?: string
  industry?: string
  timezone?: string
  maxUsers?: number
  allowSelfSignup?: boolean
  defaultPackageType?: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    requests: number
  }
}

interface Dealership {
  id: string
  name: string
  website?: string
  address?: string
  phone?: string
  activePackageType?: string
  createdAt: string
}

interface AgencyUser {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

export function AgencySettingsPage() {
  const [agency, setAgency] = useState<AgencyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  
  // Dealership management state
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [showCreateDealership, setShowCreateDealership] = useState(false)
  const [creatingDealership, setCreatingDealership] = useState(false)
  const [dealershipForm, setDealershipForm] = useState({
    name: '',
    website: '',
    address: '',
    phone: '',
    activePackageType: 'GOLD'
  })

  // Team management state
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([])
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [invitingUser, setInvitingUser] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'AGENCY_ADMIN'
  })

  useEffect(() => {
    fetchAgencyProfile()
    fetchDealerships()
  }, [])

  // Fetch users after agency profile is loaded
  useEffect(() => {
    if (agency?.id) {
      fetchAgencyUsers(agency.id)
    }
  }, [agency?.id])

  const fetchAgencyProfile = async () => {
    try {
      console.log('Fetching agency profile...')
      const response = await fetch('/api/agency/profile')
      console.log('Agency profile response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Agency profile data:', data)
        // Handle the wrapped response structure from successResponse
        if (data.success && data.data) {
          setAgency(data.data.agency)
        } else {
          setAgency(data.agency) // Fallback for direct response
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Agency profile fetch failed:', response.status, errorData)
        setMessage({ type: 'error', text: `Failed to load agency profile: ${errorData.error || 'Unknown error'}` })
      }
    } catch (error) {
      console.error('Agency profile fetch error:', error)
      setMessage({ type: 'error', text: 'Failed to load agency profile' })
    } finally {
      setLoading(false)
    }
  }

  const saveAgencyProfile = async (section: string, data: any) => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/agency/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        const updatedData = await response.json()
        // Handle the wrapped response structure from successResponse
        if (updatedData.success && updatedData.data) {
          setAgency(updatedData.data.agency)
        } else {
          setAgency(updatedData.agency) // Fallback for direct response
        }
        setMessage({ type: 'success', text: `${section} updated successfully` })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: `Failed to update ${section}` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to update ${section}` })
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    if (agency) {
      setAgency({ ...agency, [field]: value })
    }
  }

  const getCompletionPercentage = () => {
    if (!agency) return 0
    
    const fields = [
      agency.name,
      agency.domain,
      agency.description,
      agency.contactEmail,
      agency.contactPhone,
      agency.address,
      agency.city,
      agency.state,
      agency.businessType,
      agency.industry
    ]
    
    const completed = fields.filter(field => field && field.trim() !== '').length
    return Math.round((completed / fields.length) * 100)
  }

  const fetchDealerships = async () => {
    try {
      const response = await fetch('/api/dealerships/switch')
      if (response.ok) {
        const data = await response.json()
        setDealerships(data.availableDealerships || [])
      }
    } catch (error) {
      console.error('Failed to fetch dealerships:', error)
    }
  }

  const fetchAgencyUsers = async (agencyId: string) => {
    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/users`)
      if (response.ok) {
        const data = await response.json()
        setAgencyUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch agency users:', error)
    }
  }

  const createDealership = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingDealership(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/dealerships/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealership: dealershipForm
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Dealership created successfully!' })
        setShowCreateDealership(false)
        setDealershipForm({
          name: '',
          website: '',
          address: '',
          phone: '',
          activePackageType: 'GOLD'
        })
        fetchDealerships() // Refresh the list
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create dealership' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create dealership' })
    } finally {
      setCreatingDealership(false)
    }
  }

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agency?.id) {
      setMessage({ type: 'error', text: 'Agency information not available' })
      return
    }
    
    setInvitingUser(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/agencies/${agency.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'User invited successfully! They will receive an email with login instructions.' })
        setShowInviteUser(false)
        setInviteForm({
          name: '',
          email: '',
          role: 'AGENCY_ADMIN'
        })
        if (agency?.id) {
          fetchAgencyUsers(agency.id) // Refresh the list
        }
      } else {
        const error = await response.json()
        if (response.status === 409) {
          setMessage({ type: 'error', text: 'A user with this email already exists. Please use a different email address or check if they are already in your team.' })
        } else {
          setMessage({ type: 'error', text: error.error || 'Failed to invite user' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to invite user' })
    } finally {
      setInvitingUser(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!agency) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertDescription>
            Agency profile not found. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const completion = getCompletionPercentage()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agency Settings</h1>
          <p className="text-muted-foreground">
            Manage your agency profile and configuration
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Profile Completion</p>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-sm font-medium">{completion}%</span>
            </div>
          </div>
          {completion < 100 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Profile Incomplete
            </Badge>
          )}
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="dealerships" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Dealerships
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about your agency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agency Name *</Label>
                  <Input
                    id="name"
                    value={agency.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="e.g., Jay Hatfield Motors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Website Domain</Label>
                  <Input
                    id="domain"
                    value={agency.domain || ''}
                    onChange={(e) => handleFieldChange('domain', e.target.value)}
                    placeholder="e.g., jayhatfieldmotors.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={agency.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Brief description of your agency and services"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select 
                    value={agency.businessType || ''} 
                    onValueChange={(value) => handleFieldChange('businessType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automotive">Automotive Dealership</SelectItem>
                      <SelectItem value="agency">Marketing Agency</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={agency.industry || ''} 
                    onValueChange={(value) => handleFieldChange('industry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => saveAgencyProfile('profile', {
                    name: agency.name,
                    domain: agency.domain,
                    description: agency.description,
                    businessType: agency.businessType,
                    industry: agency.industry
                  })}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agency Statistics</CardTitle>
              <CardDescription>
                Overview of your agency's activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{agency._count?.users || 0}</p>
                  <p className="text-sm text-blue-700">Total Users</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{agency._count?.requests || 0}</p>
                  <p className="text-sm text-green-700">Total Requests</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{agency.maxUsers || 50}</p>
                  <p className="text-sm text-purple-700">User Limit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Manage agency administrators and team members
                  </CardDescription>
                </div>
                <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Invite a new agency administrator to your team
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={inviteUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-name">Full Name *</Label>
                        <Input
                          id="invite-name"
                          value={inviteForm.name}
                          onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address *</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          placeholder="john@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select 
                          value={inviteForm.role} 
                          onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AGENCY_ADMIN">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Agency Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="USER">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                User
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Agency Admins can manage users, dealerships, and settings
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowInviteUser(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={invitingUser}>
                          {invitingUser ? 'Sending Invite...' : 'Send Invitation'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {agencyUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Invite agency administrators to help manage your account
                  </p>
                  <Button onClick={() => setShowInviteUser(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Team Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {agencyUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'AGENCY_ADMIN' ? 'default' : 'secondary'}>
                          {user.role === 'AGENCY_ADMIN' && <Crown className="h-3 w-3 mr-1" />}
                          {user.role === 'AGENCY_ADMIN' ? 'Admin' : 'User'}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {agencyUsers.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Team Permissions</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Agency Admins</strong> can manage all agency settings, users, and dealerships</li>
                    <li>• <strong>Users</strong> can access assigned dealerships and create requests</li>
                    <li>• All team members receive email invitations with secure login links</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dealerships" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dealership Management</CardTitle>
                  <CardDescription>
                    Manage dealerships under your agency
                  </CardDescription>
                </div>
                <Dialog open={showCreateDealership} onOpenChange={setShowCreateDealership}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Dealership
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New Dealership</DialogTitle>
                      <DialogDescription>
                        Add a new dealership to your agency
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={createDealership} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dealership-name">Dealership Name *</Label>
                        <Input
                          id="dealership-name"
                          value={dealershipForm.name}
                          onChange={(e) => setDealershipForm({ ...dealershipForm, name: e.target.value })}
                          placeholder="e.g., Downtown Toyota"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dealership-website">Website</Label>
                        <Input
                          id="dealership-website"
                          value={dealershipForm.website}
                          onChange={(e) => setDealershipForm({ ...dealershipForm, website: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dealership-address">Address</Label>
                        <Input
                          id="dealership-address"
                          value={dealershipForm.address}
                          onChange={(e) => setDealershipForm({ ...dealershipForm, address: e.target.value })}
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dealership-phone">Phone</Label>
                        <Input
                          id="dealership-phone"
                          value={dealershipForm.phone}
                          onChange={(e) => setDealershipForm({ ...dealershipForm, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="package-type">Default Package</Label>
                        <Select 
                          value={dealershipForm.activePackageType} 
                          onValueChange={(value) => setDealershipForm({ ...dealershipForm, activePackageType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SILVER">Silver Package</SelectItem>
                            <SelectItem value="GOLD">Gold Package</SelectItem>
                            <SelectItem value="PLATINUM">Platinum Package</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowCreateDealership(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creatingDealership}>
                          {creatingDealership ? 'Creating...' : 'Create Dealership'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {dealerships.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Dealerships Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Get started by adding your first dealership
                  </p>
                  <Button onClick={() => setShowCreateDealership(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add First Dealership
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dealerships.map((dealership) => (
                    <Card key={dealership.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{dealership.name}</h4>
                            {dealership.website && (
                              <p className="text-sm text-muted-foreground">{dealership.website}</p>
                            )}
                            {dealership.address && (
                              <p className="text-sm text-muted-foreground mt-1">{dealership.address}</p>
                            )}
                            {dealership.phone && (
                              <p className="text-sm text-muted-foreground">{dealership.phone}</p>
                            )}
                          </div>
                          {dealership.activePackageType && (
                            <Badge variant="outline">
                              {dealership.activePackageType}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {dealerships.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Each dealership can have its own GA4 and Search Console connections</li>
                    <li>• Assign users to dealerships to give them access</li>
                    <li>• Dealerships inherit your agency's branding by default</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationPropertyManager />
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                How clients and users can reach your agency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={agency.contactEmail || ''}
                    onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                    placeholder="contact@agency.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={agency.contactPhone || ''}
                    onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={agency.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={agency.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="Chicago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={agency.state || ''}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    placeholder="IL"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={agency.zipCode || ''}
                    onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                    placeholder="60601"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={agency.country || 'US'} 
                    onValueChange={(value) => handleFieldChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => saveAgencyProfile('contact information', {
                    contactEmail: agency.contactEmail,
                    contactPhone: agency.contactPhone,
                    address: agency.address,
                    city: agency.city,
                    state: agency.state,
                    zipCode: agency.zipCode,
                    country: agency.country
                  })}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Contact Info'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agency Configuration</CardTitle>
              <CardDescription>
                Manage users, permissions, and default settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Maximum Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    max="500"
                    value={agency.maxUsers || 50}
                    onChange={(e) => handleFieldChange('maxUsers', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of users allowed in your agency
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select 
                    value={agency.timezone || 'America/New_York'} 
                    onValueChange={(value) => handleFieldChange('timezone', value)}
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Allow Self-Signup</p>
                    <p className="text-sm text-muted-foreground">
                      Let users join your agency without invitation
                    </p>
                  </div>
                  <Switch
                    checked={agency.allowSelfSignup || false}
                    onCheckedChange={(checked) => handleFieldChange('allowSelfSignup', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultPackage">Default Package Type</Label>
                  <Select 
                    value={agency.defaultPackageType || 'SILVER'} 
                    onValueChange={(value) => handleFieldChange('defaultPackageType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SILVER">Silver Package</SelectItem>
                      <SelectItem value="GOLD">Gold Package</SelectItem>
                      <SelectItem value="PLATINUM">Platinum Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => saveAgencyProfile('settings', {
                    maxUsers: agency.maxUsers,
                    timezone: agency.timezone,
                    allowSelfSignup: agency.allowSelfSignup,
                    defaultPackageType: agency.defaultPackageType
                  })}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Customization</CardTitle>
              <CardDescription>
                Customize how your agency appears to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={agency.primaryColor || '#3B82F6'}
                      onChange={(e) => handleFieldChange('primaryColor', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={agency.primaryColor || '#3B82F6'}
                      onChange={(e) => handleFieldChange('primaryColor', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={agency.secondaryColor || '#6B7280'}
                      onChange={(e) => handleFieldChange('secondaryColor', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      value={agency.secondaryColor || '#6B7280'}
                      onChange={(e) => handleFieldChange('secondaryColor', e.target.value)}
                      placeholder="#6B7280"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={agency.logoUrl || ''}
                  onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  URL to your agency logo (recommended: 200x60px)
                </p>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => saveAgencyProfile('branding', {
                    primaryColor: agency.primaryColor,
                    secondaryColor: agency.secondaryColor,
                    logoUrl: agency.logoUrl
                  })}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Branding'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Preview</CardTitle>
              <CardDescription>
                See how your branding will appear to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  borderColor: agency.primaryColor || '#3B82F6',
                  backgroundColor: `${agency.primaryColor || '#3B82F6'}10`
                }}
              >
                <div className="flex items-center gap-4">
                  {agency.logoUrl && (
                    <img 
                      src={agency.logoUrl} 
                      alt="Agency Logo" 
                      className="h-12 w-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <div>
                    <h3 
                      className="text-xl font-bold"
                      style={{ color: agency.primaryColor || '#3B82F6' }}
                    >
                      {agency.name}
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: agency.secondaryColor || '#6B7280' }}
                    >
                      {agency.description || 'Your agency description will appear here'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}