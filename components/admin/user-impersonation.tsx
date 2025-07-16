'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/simple-auth-provider'
import { UserRole } from '@prisma/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UserCircle, Search, Building2, Store, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  agency?: {
    id: string
    name: string
  } | null
  dealership?: {
    id: string
    name: string
  } | null
}

export function UserImpersonation() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonationStatus, setImpersonationStatus] = useState<any>(null)

  // Check if currently impersonating
  useEffect(() => {
    checkImpersonationStatus()
  }, [])

  const checkImpersonationStatus = async () => {
    try {
      const response = await fetch('/api/super-admin/impersonate')
      if (response.ok) {
        const data = await response.json()
        setImpersonationStatus(data)
      }
    } catch (error) {
      console.error('Error checking impersonation status:', error)
    }
  }

  // Search users when search term changes
  useEffect(() => {
    if (searchTerm.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        searchUsers()
      }, 300)
      return () => clearTimeout(delayDebounceFn)
    } else {
      setUsers([])
    }
  }, [searchTerm])

  const searchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/super-admin/users?search=${encodeURIComponent(searchTerm)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        // Filter out super admins from the list
        setUsers(data.users.filter((user: User) => user.role !== 'SUPER_ADMIN'))
      }
    } catch (error) {
      console.error('Error searching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImpersonate = async (user: User) => {
    setIsImpersonating(true)
    try {
      const response = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: user.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to impersonate user')
      }

      toast({
        title: 'Success',
        description: data.message
      })
      setIsOpen(false)
      
      // Redirect to dashboard to reload with new session
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 500)
    } catch (error) {
      console.error('Error impersonating user:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to impersonate user',
        variant: 'destructive'
      })
    } finally {
      setIsImpersonating(false)
    }
  }

  const handleStopImpersonation = async () => {
    setIsImpersonating(true)
    try {
      const response = await fetch('/api/super-admin/impersonate', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop impersonation')
      }

      toast({
        title: 'Success',
        description: data.message
      })
      setImpersonationStatus(null)
      
      // Redirect to super admin dashboard
      setTimeout(() => {
        router.push('/super-admin')
        router.refresh()
      }, 500)
    } catch (error) {
      console.error('Error stopping impersonation:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop impersonation',
        variant: 'destructive'
      })
    } finally {
      setIsImpersonating(false)
    }
  }

  // Only show for super admins
  if (user?.role !== 'SUPER_ADMIN') {
    return null
  }

  // If currently impersonating, show stop button
  if (impersonationStatus?.impersonating) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <UserCircle className="h-4 w-4 text-orange-500" />
          <span className="text-orange-600">
            Impersonating: <strong>{impersonationStatus.currentUser.email}</strong>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStopImpersonation}
          disabled={isImpersonating}
          className="border-orange-500 text-orange-600 hover:bg-orange-50"
        >
          {isImpersonating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Stopping..
            </>
          ) : (
            'Stop Impersonation'
          )}
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCircle className="mr-2 h-4 w-4" />
          Impersonate User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Impersonate User</DialogTitle>
          <DialogDescription>
            Search for and impersonate another user to test the system from their perspective. You can only impersonate non-super admin users.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          )}
          {!isLoading && users.length > 0 && (
            <div className="h-[300px] overflow-y-auto border rounded-lg p-2">
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name || user.email}</span>
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {user.agency && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {user.agency?.name}
                          </div>
                        )}
                        {user.dealership && (
                          <div className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {user.dealership?.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleImpersonate(user)}
                      disabled={isImpersonating}
                    >
                      {isImpersonating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Impersonate'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isLoading && searchTerm.length > 2 && users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching "{searchTerm}"
            </div>
          )}
          {searchTerm.length <= 2 && (
            <div className="text-center py-8 text-gray-500">
              Type at least 3 characters to search
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 
