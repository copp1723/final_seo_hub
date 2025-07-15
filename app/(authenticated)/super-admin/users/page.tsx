'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserRole } from '@prisma/client'
import type { users, agencies } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowUpDown, 
  Edit2, 
  PlusCircle, 
  Trash2, 
  Users, 
  Search,
  Filter,
  Download,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading'

type UserWithAgency = users & {
  agency: agencies | null
  _count: {
    requests: number
  }
}

interface PaginatedUsersResponse {
  users: UserWithAgency[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserWithAgency[]>([])
  const [agencies, setAgencies] = useState<agencies[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithAgency | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    email: string
    role: UserRole
    agencyId: string
  }>({ name: '', email: '', role: UserRole.USER, agencyId: '' })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserWithAgency | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: searchTerm,
      role: roleFilter,
      agency: agencyFilter,
      sortBy: sortBy,
      sortOrder: sortOrder
    }).toString()

    try {
      const response = await fetch(`/api/super-admin/users?${queryParams}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }
      const data: PaginatedUsersResponse = await response.json()
      setUsers(data.users)
      setTotalUsers(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching users.'
      setError(errorMessage)
      toast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, searchTerm, roleFilter, agencyFilter, sortBy, sortOrder])

  const fetchAgencies = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/agencies')
      if (response.ok) {
        const data = await response.json()
        setAgencies(data.agencies)
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    fetchAgencies()
  }, [fetchAgencies])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as UserRole }))
  }

  const handleAgencyChange = (value: string) => {
    setFormData(prev => ({ ...prev, agencyId: value === 'none' ? '' : value }))
  }

  const openModalForCreate = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', role: UserRole.USER, agencyId: '' })
    setIsModalOpen(true)
  }

  const openModalForEdit = (user: UserWithAgency) => {
    setEditingUser(user)
    setFormData({ 
      name: user.name || '', 
      email: user.email || '', 
      role: user.role,
      agencyId: user.agency?.id || ''
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = '/api/super-admin/users'
    const method = editingUser ? 'PUT' : 'POST'

    const requestBody: Record<string, any> = { ...formData }
    if (editingUser) {
      requestBody.userId = editingUser.id
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || (editingUser ? 'Failed to update user' : 'Failed to create user'))
      }
      toast(`User ${editingUser ? 'updated' : 'created'} successfully.`, 'success')
      setIsModalOpen(false)
      fetchUsers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during submission.'
      toast(errorMessage, 'error')
    }
  }

  const openDeleteConfirm = (user: UserWithAgency) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/super-admin/users?userId=${userToDelete.id}`, {
        method: 'DELETE'
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete user')
      }
      toast('User deleted successfully.', 'success')
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while deleting user.'
      toast(errorMessage, 'error')
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const variants = {
      SUPER_ADMIN: 'bg-red-100 text-red-800',
      ADMIN: 'bg-purple-100 text-purple-800',
      AGENCY_ADMIN: 'bg-blue-100 text-blue-800',
      USER: 'bg-gray-100 text-gray-800'
    }
    const validVariants: Record<string, string> = {
      SUPER_ADMIN: 'bg-red-100 text-red-800',
      AGENCY_ADMIN: 'bg-blue-100 text-blue-800',
      DEALERSHIP_ADMIN: 'bg-green-100 text-green-800',
      USER: 'bg-gray-100 text-gray-800',
      ADMIN: 'bg-blue-100 text-blue-800' // Legacy support
    }
    return <Badge className={validVariants[role] || 'bg-gray-100 text-gray-800'}>{role}</Badge>
  }

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead onClick={() => handleSort(column)} className="cursor-pointer">
      <div className="flex items-center">
        {label}
        {sortBy === column && <ArrowUpDown className="ml-2 h-4 w-4" />}
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="mr-3 h-8 w-8" />
            User Management
          </h1>
          <p className="text-gray-600 mt-2">Manage all users across the platform</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={openModalForCreate}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'SUPER_ADMIN').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agency Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'AGENCY_ADMIN').length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Regular Users</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'USER').length}</p>
              </div>
              <UserX className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}}
                className="w-full"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value: string) => {setRoleFilter(value); setPage(1);}}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                <SelectItem value="USER">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agencyFilter} onValueChange={(value: string) => {setAgencyFilter(value); setPage(1);}}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                <SelectItem value="none">No Agency</SelectItem>
                {agencies.map((agency: agencies) => (
                  <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(val: string) => {setLimit(parseInt(val)); setPage(1);}}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {isLoading && <div className="flex justify-center items-center py-10"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      {!isLoading && !error && users.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Users Found</h3>
            <p className="text-gray-600 mb-4">No users match your current filters</p>
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && users.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="name" label="Name" />
                    <SortableHeader column="email" label="Email" />
                    <SortableHeader column="role" label="Role" />
                    <TableHead>Agency</TableHead>
                    <TableHead>Requests</TableHead>
                    <SortableHeader column="createdAt" label="Created" />
                    <SortableHeader column="updatedAt" label="Last Active" />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.agency?.name || 'No Agency'}</TableCell>
                      <TableCell>{user._count.requests}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>{formatDate(user.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openModalForEdit(user)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openDeleteConfirm(user)}
                            disabled={user.role === 'SUPER_ADMIN'}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Pagination */}
      {!isLoading && !error && users.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">
            Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalUsers)} of {totalUsers} users
          </span>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {/* Add/Edit User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update the details for this user.' : 'Enter the details for the new user.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <Input 
                name="name" 
                placeholder="Full Name" 
                value={formData.name} 
                onChange={handleInputChange} 
                required 
              />
              <Input 
                name="email" 
                type="email" 
                placeholder="Email Address" 
                value={formData.email} 
                onChange={handleInputChange} 
                required 
                disabled={!!editingUser} 
              />
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="AGENCY_ADMIN">Agency Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formData.agencyId || 'none'} onValueChange={handleAgencyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Agency</SelectItem>
                  {agencies.map((agency: agencies) => (
                    <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{editingUser ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the user: <strong>{userToDelete?.name} ({userToDelete?.email})</strong>? 
              This action cannot be undone and will also delete all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
