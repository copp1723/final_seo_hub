'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Check,
  X,
  Send,
  Building2
} from 'lucide-react'
import { useAuth } from '@/app/simple-auth-provider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
  emailVerified: boolean
  agencyId: string | null
  agencies?: {
    id: string
    name: string
  } | null
  dealershipId: string | null
  dealership?: {
    id: string
    name: string
  }
  createdAt: string
  onboardingCompleted: boolean
  password: string | null
}

interface Agency {
  id: string
  name: string
}

interface Dealership {
  id: string
  name: string
  agencyId: string
}

export default function UsersManagement() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'USER',
    agencyId: '',
    dealershipId: ''
  })

  useEffect(() => {
    if (!user) return
    
    if (user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchUsers()
    fetchAgencies()
    fetchDealerships()
  }, [user, router, currentPage, searchTerm, roleFilter, agencyFilter])

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25',
        search: searchTerm,
        role: roleFilter,
        agency: agencyFilter
      })

      const response = await fetch(`/api/super-admin/users?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgencies = async () => {
    try {
      const response = await fetch('/api/super-admin/agencies')
      if (response.ok) {
        const data = await response.json()
        setAgencies(data.agencies || [])
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
    }
  }

  const fetchDealerships = async () => {
    try {
      const response = await fetch('/api/dealerships')
      if (response.ok) {
        const data = await response.json()
        setDealerships(data.dealerships || [])
      }
    } catch (error) {
      console.error('Error fetching dealerships:', error)
    }
  }

  const handleInviteUser = async () => {
    try {
      // Prepare payload for generic invitation endpoint
      const payload = {
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        agencyId: inviteForm.agencyId || undefined,
        dealershipId: inviteForm.dealershipId || undefined,
        expiresInHours: 72
      }
      const response = await fetch('/api/invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite user')
      }

      const data = await response.json()
      // Display appropriate toast based on email send result
      if (data.invitationSent) {
        toast.success('Invitation sent successfully!')
      } else {
        toast.success('User created successfully!')
      }
      setShowInviteDialog(false)
      // Reset invite form
      setInviteForm({
        name: '',
        email: '',
        role: 'USER',
        agencyId: '',
        dealershipId: ''
      })
      fetchUsers()
    } catch (error: any) {
      console.error('Error inviting user:', error)
      toast.error(error.message || 'Failed to invite user')
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editingUser.name,
          role: editingUser.role,
          // Send agencyId only if present; avoid sending null which fails validation
          agencyId: editingUser.agencyId || undefined
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      toast.success('User updated successfully!')
      setShowEditDialog(false)
      setEditingUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/super-admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      toast.success('User deleted successfully!')
      fetchUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Failed to delete user')
    }
  }

  const handleResendInvitation = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to resend the invitation to ${userEmail}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/super-admin/users/${userId}/resend-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resend invitation')
      }

      const data = await response.json()
      toast.success(data.message)
      fetchUsers()
    } catch (error: any) {
      console.error('Error resending invitation:', error)
      toast.error(error.message || 'Failed to resend invitation')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800'
      case 'AGENCY_ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'USER':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredDealerships = dealerships.filter(d => 
    !inviteForm.agencyId || d.agencyId === inviteForm.agencyId
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage users, roles, and invitations</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Invite User</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                <SelectItem value="USER">Dealership User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Users ({users.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Agency</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{user.name || 'No name'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {user.agencies?.name || 'No agency'}
                        {user.dealership && (
                          <div className="text-xs text-gray-500">{user.dealership.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col space-y-1">
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.emailVerified ? (
                          <div className="flex items-center text-xs text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Verified
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-red-600">
                            <X className="h-3 w-3 mr-1" />
                            Unverified
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingUser(user)
                              setShowEditDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/users/${user.id}/dealership-access`)}
                            className="text-purple-600"
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            Manage Dealership Access
                          </DropdownMenuItem>
                          {(!user.onboardingCompleted || !user.password) && (
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(user.id, user.email)}
                              className="text-blue-600"
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to join the GSEO Hub platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={inviteForm.name}
                onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select 
                value={inviteForm.role} 
                onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                  <SelectItem value="USER">Dealership User</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(inviteForm.role === 'AGENCY_ADMIN' || inviteForm.role === 'USER') && (
              <div>
                <Label htmlFor="agency">Agency</Label>
                <Select 
                  value={inviteForm.agencyId} 
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, agencyId: value, dealershipId: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agency" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {inviteForm.role === 'USER' && inviteForm.agencyId && (
              <div>
                <Label htmlFor="dealership">Dealership (Required for Users)</Label>
                <Select 
                  value={inviteForm.dealershipId} 
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, dealershipId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDealerships.map((dealership) => (
                      <SelectItem key={dealership.id} value={dealership.id}>
                        {dealership.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser(prev => prev ? ({ ...prev, role: value }) : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                    <SelectItem value="USER">Dealership User</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(editingUser.role === 'AGENCY_ADMIN' || editingUser.role === 'USER') && (
                <div>
                  <Label htmlFor="edit-agency">Agency</Label>
                  <Select 
                    value={editingUser.agencyId || ''} 
                    onValueChange={(value) => setEditingUser(prev => prev ? ({ ...prev, agencyId: value || null }) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No agency</SelectItem>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
