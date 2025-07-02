'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { User, UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { ArrowUpDown, Edit2, PlusCircle, Trash2, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading'

type AgencyUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'>

const USER_ROLES_EDITABLE_BY_AGENCY_ADMIN = [UserRole.USER, UserRole.AGENCY_ADMIN]
const USER_ROLES_EDITABLE_BY_SUPER_ADMIN = Object.values(UserRole)


export default function AgencyUsersPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const agencyId = params.agencyId as string

  const [users, setUsers] = useState<AgencyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AgencyUser | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    email: string
    role: UserRole
  }>({ name: '', email: '', role: UserRole.USER })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AgencyUser | null>(null)


  const fetchUsers = useCallback(async () => {
    if (status === 'loading' || !session || !agencyId) return
    if (session.user.role !== UserRole.SUPER_ADMIN && (session.user.role !== UserRole.AGENCY_ADMIN || session.user.agencyId !== agencyId)) {
      setError("Access Denied. You don&apos;t have permission to manage these users.")
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/users`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching users.'
      setError(errorMessage)
      toast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [status, session, agencyId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as UserRole }))
  }

  const openModalForCreate = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', role: UserRole.USER })
    setIsModalOpen(true)
  }

  const openModalForEdit = (user: AgencyUser) => {
    setEditingUser(user)
    setFormData({ name: user.name || '', email: user.email || '', role: user.role })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    const url = editingUser
      ? `/api/admin/agencies/${agencyId}/users` // PUT request includes userId in body
      : `/api/admin/agencies/${agencyId}/users`
    const method = editingUser ? 'PUT' : 'POST'

    let requestBody: Record<string, any> = { ...formData };
    if (editingUser) {
        // For PUT, send userId and only fields that are being updated (name, role)
        // Email is not updatable via this form once user is created
        requestBody = {
            userId: editingUser.id,
            name: formData.name,
            role: formData.role
        };
    }
    // For POST (creating user), email is included from formData


    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const responseData = await response.json()
      if (!response.ok) {
        // Use `responseData.details` if available for validation errors
        const mainErrorMessage = responseData.error || (editingUser ? 'Failed to update user' : 'Failed to create user');
        interface ErrorDetail { message: string }
        const errorDetailsMessage = responseData.details && Array.isArray(responseData.details)
          ? ` (${responseData.details.map((d: ErrorDetail) => d.message).join(', ')})`
          : '';
        throw new Error(`${mainErrorMessage}${errorDetailsMessage}`);
      }
      toast(`User ${editingUser ? 'updated' : 'created'} successfully.`, 'success')
      setIsModalOpen(false)
      fetchUsers() // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during submission.'
      toast(errorMessage, 'error')
    }
  }

  const openDeleteConfirm = (user: AgencyUser) => {
    if (user.id === session?.user.id) {
        toast("You cannot delete yourself.", 'error');
        return;
    }
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  }

  const handleDeleteUser = async () => {
    if (!userToDelete || !session) return;

    // Prevent deleting oneself (double check, already in openDeleteConfirm)
    if (userToDelete.id === session.user.id) {
      toast("You cannot delete yourself.", 'error');
      setShowDeleteConfirm(false);
      return;
    }
    // Prevent AGENCY_ADMIN from deleting SUPER_ADMIN or ADMIN
    if (session.user.role === UserRole.AGENCY_ADMIN && (userToDelete.role === UserRole.SUPER_ADMIN || userToDelete.role === UserRole.ADMIN)) {
        toast("AGENCY_ADMINs cannot delete SUPER_ADMIN or ADMIN users.", 'error');
        setShowDeleteConfirm(false);
        return;
    }
    // Prevent anyone from deleting SUPER_ADMIN through this UI (API has stricter checks too)
    if (userToDelete.role === UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUPER_ADMIN) { // Only super admin can delete super admin
         toast("Only a SUPER_ADMIN can delete another SUPER_ADMIN.", 'error');
         setShowDeleteConfirm(false);
         return;
    }
     if (userToDelete.role === UserRole.SUPER_ADMIN && userToDelete.id !== session.user.id && session.user.role === UserRole.SUPER_ADMIN) {
        // A SUPER_ADMIN trying to delete another SUPER_ADMIN. This might be allowed or disallowed by policy.
        // The API has the final say. For now, let's allow the attempt.
    }


    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/users?userId=${userToDelete.id}`, {
        method: 'DELETE',
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete user')
      }
      toast('User deleted successfully.', 'success')
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      fetchUsers() // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while deleting user.'
      toast(errorMessage, 'error')
    }
  }

  const getEditableRoles = () => {
    if (session?.user.role === UserRole.SUPER_ADMIN) {
      return USER_ROLES_EDITABLE_BY_SUPER_ADMIN;
    }
    if (session?.user.role === UserRole.AGENCY_ADMIN) {
      // Agency admin cannot promote to ADMIN or SUPER_ADMIN
      // and cannot demote an ADMIN or SUPER_ADMIN
      if (editingUser && (editingUser.role === UserRole.ADMIN || editingUser.role === UserRole.SUPER_ADMIN)) {
        return [editingUser.role]; // Can only keep current role for these users
      }
      return USER_ROLES_EDITABLE_BY_AGENCY_ADMIN;
    }
    return [UserRole.USER]; // Default to least privilege
  }


  if (status === 'loading') return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>
  if (!session || (session.user.role !== UserRole.SUPER_ADMIN && (session.user.role !== UserRole.AGENCY_ADMIN || session.user.agencyId !== agencyId))) {
     return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p>You do not have permission to view this page. Please contact your administrator.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><Users className="mr-3 h-8 w-8" />Manage Agency Users</h1>
        <Button onClick={openModalForCreate}><PlusCircle className="mr-2 h-5 w-5" /> Add New User</Button>
      </div>

      {isLoading && <div className="flex justify-center items-center py-10"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      {!isLoading && !error && users.length === 0 && (
        <p className="text-center text-gray-500 py-10">No users found for this agency.</p>
      )}

      {!isLoading && !error && users.length > 0 && (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>{formatDate(user.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openModalForEdit(user)} className="mr-2">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {user.id !== session?.user.id && ( // Prevent deleting self via button
                      <Button variant="ghost" size="sm" onClick={() => openDeleteConfirm(user)} disabled={user.role === UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUPER_ADMIN}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              <Input name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} required />
              <Input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} required disabled={!!editingUser} />
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {getEditableRoles().map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
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
                    Are you sure you want to delete the user: <strong>{userToDelete?.name} ({userToDelete?.email})</strong>? This action cannot be undone.
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
