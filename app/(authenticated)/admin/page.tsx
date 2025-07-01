'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Building2, Users, FileText } from 'lucide-react'

interface Agency {
  id: string
  name: string
  domain?: string
  settings: object
  createdAt: string
  users: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  _count: {
    users: number
    requests: number
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', domain: '' })
  const [creating, setCreating] = useState(false)

  // Check if user is Super Admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }
    
    fetchAgencies()
  }, [session, status, router])

  const fetchAgencies = async () => {
    try {
      const response = await fetch('/api/admin/agencies')
      if (response.ok) {
        const data = await response.json()
        setAgencies(data.agencies)
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const createAgency = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ name: '', domain: '' })
        setShowCreateForm(false)
        fetchAgencies()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create agency')
      }
    } catch (error) {
      console.error('Error creating agency:', error)
      alert('Failed to create agency')
    } finally {
      setCreating(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage agencies and system settings</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Agency
        </Button>
      </div>

      {/* Create Agency Form */}
      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Agency</CardTitle>
            <CardDescription>Set up a new agency for dealership management</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAgency} className="space-y-4">
              <div>
                <Label htmlFor="name">Agency Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AutoMax Marketing Group"
                  required
                />
              </div>
              <div>
                <Label htmlFor="domain">Domain (Optional)</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="e.g., automax.com"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Agency'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Agencies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agencies.map((agency) => (
          <Card key={agency.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {agency.name}
                  </CardTitle>
                  {agency.domain && (
                    <CardDescription className="mt-1">{agency.domain}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{agency._count.users} Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{agency._count.requests} Requests</span>
                </div>
              </div>
              
              {agency.users.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Users:</h4>
                  <div className="space-y-1">
                    {agency.users.slice(0, 3).map((user) => (
                      <div key={user.id} className="flex items-center justify-between text-sm">
                        <span>{user.name || user.email}</span>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'info'}>
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                    {agency.users.length > 3 && (
                      <p className="text-xs text-gray-500">+{agency.users.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  Created: {new Date(agency.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agencies.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Agencies Found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first agency</p>
            <Button onClick={() => setShowCreateForm(true)}>Create Agency</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 