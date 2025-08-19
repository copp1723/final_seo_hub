'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/simple-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowLeft, Building2, Shield, Trash2, Plus, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import Link from 'next/link'

interface UserDealershipAccess {
  id: string
  dealershipId: string
  accessLevel: 'READ' | 'WRITE' | 'ADMIN'
  grantedAt: string
  expiresAt?: string
  isActive: boolean
  dealership: {
    id: string
    name: string
    agencyId: string
    agencies: {
      name: string
    }
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  agencyId?: string
  dealershipId?: string
  currentDealershipId?: string
}

interface Dealership {
  id: string
  name: string
  agencyId: string
  agencies: {
    name: string
  }
}

export default function UserDealershipAccessPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const userId = params.userId as string

  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [currentAccess, setCurrentAccess] = useState<UserDealershipAccess[]>([])
  const [availableDealerships, setAvailableDealerships] = useState<Dealership[]>([])
  const [loading, setLoading] = useState(true)
  const [granting, setGranting] = useState(false)
  const [selectedDealership, setSelectedDealership] = useState('')
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ')

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.push('/admin')
      return
    }
    
    fetchUserAndAccess()
  }, [user, userId, router])

  const fetchUserAndAccess = async () => {
    try {
      // Fetch user details
      const userResponse = await fetch(`/api/admin/users/${userId}`)
      if (!userResponse.ok) throw new Error('Failed to fetch user')
      const userData = await userResponse.json()
      setTargetUser(userData.user)

      // Fetch user's current dealership access
      const accessResponse = await fetch(`/api/admin/users/${userId}/dealership-access`)
      if (!accessResponse.ok) throw new Error('Failed to fetch access')
      const accessData = await accessResponse.json()
      setCurrentAccess(accessData.access || [])

      // Fetch all available dealerships
      const dealershipsResponse = await fetch('/api/admin/dealerships')
      if (!dealershipsResponse.ok) throw new Error('Failed to fetch dealerships')
      const dealershipsData = await dealershipsResponse.json()
      setAvailableDealerships(dealershipsData.dealerships || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load user access data')
    } finally {
      setLoading(false)
    }
  }

  const grantAccess = async () => {
    if (!selectedDealership || !selectedAccessLevel) {
      toast.error('Please select a dealership and access level')
      return
    }

    setGranting(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/dealership-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealershipId: selectedDealership,
          accessLevel: selectedAccessLevel
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to grant access')
      }

      toast.success('Access granted successfully')
      setSelectedDealership('')
      setSelectedAccessLevel('READ')
      fetchUserAndAccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGranting(false)
    }
  }

  const revokeAccess = async (accessId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/dealership-access/${accessId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to revoke access')
      }

      toast.success('Access revoked successfully')
      fetchUserAndAccess()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const updateAccessLevel = async (accessId: string, newLevel: 'READ' | 'WRITE' | 'ADMIN') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/dealership-access/${accessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessLevel: newLevel })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update access')
      }

      toast.success('Access level updated successfully')
      fetchUserAndAccess()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Filter out dealerships user already has access to
  const availableForGrant = availableDealerships.filter(
    dealership => !currentAccess.some(access => access.dealershipId === dealership.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading user access...</p>
        </div>
      </div>
    )
  }

  if (!targetUser) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            User not found or you don't have permission to view this user.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="mr-3 h-8 w-8" />
            Dealership Access Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage {targetUser.name || targetUser.email}'s access to dealerships
          </p>
        </div>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-lg font-semibold">{targetUser.name || 'No name'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg">{targetUser.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <Badge variant="outline" className="text-sm">
                {targetUser.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant New Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Grant New Dealership Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dealership</label>
              <Select value={selectedDealership} onValueChange={setSelectedDealership}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dealership" />
                </SelectTrigger>
                <SelectContent>
                  {availableForGrant.map(dealership => (
                    <SelectItem key={dealership.id} value={dealership.id}>
                      {dealership.name} ({dealership.agencies.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Level</label>
              <Select value={selectedAccessLevel} onValueChange={(value: 'READ' | 'WRITE' | 'ADMIN') => setSelectedAccessLevel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ">👁️ Read Only</SelectItem>
                  <SelectItem value="WRITE">✏️ Read & Write</SelectItem>
                  <SelectItem value="ADMIN">🔑 Full Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={grantAccess} 
                disabled={granting || !selectedDealership}
                className="w-full"
              >
                {granting ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Access Levels:</strong></p>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Read Only:</strong> View dealership data, reports, and analytics</li>
              <li>• <strong>Read & Write:</strong> Edit content, create requests, manage settings</li>
              <li>• <strong>Full Admin:</strong> Complete control including user management</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Current Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Current Dealership Access ({currentAccess.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentAccess.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No dealership access granted</p>
              <p className="text-sm">Grant access to dealerships above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentAccess.map((access) => (
                <div key={access.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-semibold">{access.dealership.name}</h3>
                        <p className="text-sm text-gray-600">{access.dealership.agencies.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Granted {new Date(access.grantedAt).toLocaleDateString()}
                      </p>
                      {access.expiresAt && (
                        <p className="text-sm text-orange-600">
                          Expires {new Date(access.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <Select 
                      value={access.accessLevel} 
                      onValueChange={(value: 'READ' | 'WRITE' | 'ADMIN') => updateAccessLevel(access.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ">👁️ Read</SelectItem>
                        <SelectItem value="WRITE">✏️ Write</SelectItem>
                        <SelectItem value="ADMIN">🔑 Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeAccess(access.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}