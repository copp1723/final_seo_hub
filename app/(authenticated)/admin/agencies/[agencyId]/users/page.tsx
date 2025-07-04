'use client'

import { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { User, UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { ArrowUpDown, Edit2, PlusCircle, Trash2, Users, UserPlus, Mail, Clock, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading'
import { DeleteUserDialog } from '@/components/admin/delete-user-dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type AgencyUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'>

const USER_ROLES_EDITABLE_BY_AGENCY_ADMIN = [UserRole.USER, UserRole.AGENCY_ADMIN]
const USER_ROLES_EDITABLE_BY_SUPER_ADMIN = Object.values(UserRole)

interface Invitation {
  id: string
  email: string
  name?: string | null
  role: UserRole
  message?: string | null
  acceptedAt?: string | null
  expiresAt: string
  createdAt: string
  inviter: {
    id: string
    name?: string | null
    email: string
  }
  acceptedBy?: {
    id: string
    name?: string | null
    email: string
  } | null
}

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

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: UserRole.USER,
    message: ''
  })
  const [inviteLoading, setInviteLoading] = useState(false)

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

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/invitations`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch invitations')
      }
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (err) {
      console.error('Error fetching invitations:', err)
    }
  }

  useEffect(() => {
    if (session) {
      if (session.user.role !== UserRole.SUPER_ADMIN && (session.user.role !== UserRole.AGENCY_ADMIN || session.user.agencyId !== agencyId)) {
        setError("Access Denied. You don&apos;t have permission to manage these users.")
        setIsLoading(false)
        return
      }
      fetchUsers()
      fetchInvitations()
    }
  }, [session, agencyId])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleSubmit = async (e: FormEvent) => {
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

  const handleInviteUser = async () => {
    setInviteLoading(true)
    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }
      
      toast('Invitation sent successfully!', 'success')
      setShowInviteDialog(false)
      setInviteForm({ email: '', name: '', role: UserRole.USER, message: '' })
      fetchInvitations() // Refresh invitations list
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send invitation', 'error')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return
    
    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/invitations?invitationId=${invitationId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete invitation')
      }
      
      toast('Invitation deleted successfully', 'success')
      fetchInvitations() // Refresh invitations list
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete invitation', 'error')
    }
  }

  const handleUpdateUser = async (userId: string) => {
    if (!editingUser) return
    
    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: editingUser.name,
          role: editingUser.role
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }
      
      toast('User updated successfully', 'success')
      setEditingUser(null)
      fetchUsers() // Refresh the list
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update user', 'error')
    }
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Users</h1>
        <Button 
          onClick={() => setShowInviteDialog(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Active Users</TabsTrigger>
          <TabsTrigger value="invitations" className="relative">
            Invitations
            {invitations.filter(inv => !inv.acceptedAt && new Date(inv.expiresAt) > new Date()).length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {invitations.filter(inv => !inv.acceptedAt && new Date(inv.expiresAt) > new Date()).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{user.name || 'No name'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser?.id === user.id ? (
                          <Select
                            value={editingUser.role}
                            onValueChange={(value) => setEditingUser({ ...editingUser, role: value as UserRole })}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {getEditableRoles().map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {user.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              onClick={() => handleSubmit(new Event('submit'))}
                              className="text-green-600 hover:text-green-900 mr-2"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              Edit
                            </button>
                            {user.id !== session?.user.id && (
                              <button
                                onClick={() => setSelectedUserId(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations">
          {invitations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No invitations sent yet.</p>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expiresAt) < new Date()
                const isAccepted = !!invitation.acceptedAt
                const isPending = !isExpired && !isAccepted
                
                return (
                  <div key={invitation.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{invitation.email}</span>
                          {invitation.name && (
                            <span className="text-gray-500">({invitation.name})</span>
                          )}
                          <Badge variant={
                            isAccepted ? 'default' : 
                            isExpired ? 'secondary' : 
                            'outline'
                          }>
                            {invitation.role.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Invited by {invitation.inviter.name || invitation.inviter.email}</span>
                          <span>•</span>
                          <span>{new Date(invitation.createdAt).toLocaleDateString()}</span>
                          
                          {isAccepted && invitation.acceptedBy && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Accepted by {invitation.acceptedBy.name || invitation.acceptedBy.email}
                              </span>
                            </>
                          )}
                          
                          {isExpired && !isAccepted && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-red-500">
                                <Clock className="h-3 w-3" />
                                Expired
                              </span>
                            </>
                          )}
                          
                          {isPending && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock className="h-3 w-3" />
                                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {invitation.message && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            &ldquo;{invitation.message}&rdquo;
                          </p>
                        )}
                      </div>
                      
                      {isPending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DeleteUserDialog
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onDeleted={() => {
          fetchUsers()
          setSelectedUserId(null)
        }}
      />

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User to Agency</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new user to your agency.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="invite-name">Name (Optional)</Label>
              <Input
                id="invite-name"
                placeholder="John Doe"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as UserRole })}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getEditableRoles().map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="invite-message">Personal Message (Optional)</Label>
              <Textarea
                id="invite-message"
                placeholder="Add a personal message to the invitation..."
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={inviteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={!inviteForm.email || inviteLoading}
              className="flex items-center gap-2"
            >
              {inviteLoading ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
