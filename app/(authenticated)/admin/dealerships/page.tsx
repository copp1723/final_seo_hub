'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Building2, UserPlus, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Dealership {
  id: string
  name: string
  agencyId: string
  agencies: {
    id: string
    name: string
  }
  _count: {
    users: number
  }
}

export default function DealershipsPage() {
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDealership, setSelectedDealership] = useState<Dealership | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: ''
  })
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    fetchDealerships()
  }, [])

  const fetchDealerships = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/dealerships')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dealerships')
      }

      const data = await response.json()
      setDealerships(data.dealerships || [])
    } catch (err: any) {
      setError(err.message)
      toast.error('Failed to load dealerships')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDealership) return

    try {
      setIsInviting(true)
      const response = await fetch(`/api/dealerships/${selectedDealership.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite user')
      }

      const data = await response.json()
      toast.success(data.invitationSent ? 'Invitation sent successfully!' : 'User created but email failed to send')
      
      setIsInviteModalOpen(false)
      setInviteForm({ name: '', email: '' })
      setSelectedDealership(null)
      
      // Refresh dealerships to update user count
      fetchDealerships()
    } catch (error: any) {
      console.error('Error inviting user:', error)
      toast.error(error.message || 'Failed to invite user')
    } finally {
      setIsInviting(false)
    }
  }

  const openInviteModal = (dealership: Dealership) => {
    setSelectedDealership(dealership)
    setIsInviteModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Building2 className="mr-3 h-8 w-8" />
              Dealership Management
            </h1>
            <p className="text-gray-600 mt-2">Loading dealerships...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Building2 className="mr-3 h-8 w-8" />
              Dealership Management
            </h1>
            <p className="text-red-600 mt-2">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="mr-3 h-8 w-8" />
            Dealership Management
          </h1>
          <p className="text-gray-600 mt-2">Manage dealerships and invite users</p>
        </div>
      </div>

      {/* Dealerships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dealerships.map((dealership) => (
          <Card key={dealership.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{dealership.name}</CardTitle>
              <CardDescription>
                Agency: {dealership.agencies.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Users:</span>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {dealership._count.users}
                  </Badge>
                </div>
                
                <Button 
                  onClick={() => openInviteModal(dealership)}
                  className="w-full"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dealerships.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Dealerships Found</h3>
            <p className="text-gray-600">No dealerships are available to manage.</p>
          </CardContent>
        </Card>
      )}

      {/* Invite User Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User to {selectedDealership?.name}</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to access this dealership's dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter user's full name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter user's email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsInviteModalOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
