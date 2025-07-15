'use client'

import { useState, useEffect } from 'react'
import type { agencies, users } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { 
  Building2, 
  Users, 
  FileText, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  ExternalLink,
  BarChart3,
  Settings,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading'

type AgencyWithDetails = agencies & {
  users: users[]
  _count: {
    users: number
    requests: number
  }
}

export default function SuperAdminAgenciesPage() {
  const [agencies, setAgencies] = useState<AgencyWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgency, setEditingAgency] = useState<AgencyWithDetails | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    domain: string
  }>({ name: '', domain: '' })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [agencyToDelete, setAgencyToDelete] = useState<AgencyWithDetails | null>(null)

  useEffect(() => {
    fetchAgencies()
  }, [])

  const fetchAgencies = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/super-admin/agencies')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch agencies')
      }
      const data = await response.json()
      setAgencies(data.agencies)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching agencies.'
      setError(errorMessage)
      toast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const openModalForCreate = () => {
    setEditingAgency(null)
    setFormData({ name: '', domain: '' })
    setIsModalOpen(true)
  }

  const openModalForEdit = (agency: AgencyWithDetails) => {
    setEditingAgency(agency)
    setFormData({ 
      name: agency.name, 
      domain: agency.domain || '' 
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingAgency
      ? `/api/super-admin/agencies/${editingAgency.id}`
      : '/api/super-admin/agencies'
    const method = editingAgency ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || (editingAgency ? 'Failed to update agency' : 'Failed to create agency'))
      }
      toast(`Agency ${editingAgency ? 'updated' : 'created'} successfully.`, 'success')
      setIsModalOpen(false)
      fetchAgencies()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during submission.'
      toast(errorMessage, 'error')
    }
  }

  const openDeleteConfirm = (agency: AgencyWithDetails) => {
    setAgencyToDelete(agency)
    setShowDeleteConfirm(true)
  }

  const handleDeleteAgency = async () => {
    if (!agencyToDelete) return

    try {
      const response = await fetch(`/api/super-admin/agencies/${agencyToDelete.id}`, {
        method: 'DELETE'
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete agency')
      }
      toast('Agency deleted successfully.', 'success')
      setShowDeleteConfirm(false)
      setAgencyToDelete(null)
      fetchAgencies()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while deleting agency.'
      toast(errorMessage, 'error')
    }
  }

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agency.domain && agency.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalUsers = agencies.reduce((sum, agency) => sum + agency._count.users, 0)
  const totalRequests = agencies.reduce((sum, agency) => sum + agency._count.requests, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="mr-3 h-8 w-8" />
            Agency Management
          </h1>
          <p className="text-gray-600 mt-2">Manage all agencies and their settings</p>
        </div>
        <Button onClick={openModalForCreate}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Agency
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Agencies</p>
                <p className="text-3xl font-bold">{agencies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold">{totalRequests}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search agencies by name or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          </CardContent>
      </Card>

      {/* Loading and Error States */}
      {isLoading && <div className="flex justify-center items-center py-10"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      {/* Agencies Grid */}
      {!isLoading && !error && filteredAgencies.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Agencies Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No agencies match your search criteria' : 'Get started by creating your first agency'}
            </p>
            {!searchTerm && (
              <Button onClick={openModalForCreate}>Create Agency</Button>
            )}
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && filteredAgencies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map((agency) => (
            <Card key={agency.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {agency.name}
                    </CardTitle>
                    {agency.domain && (
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {agency.domain}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openModalForEdit(agency)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openDeleteConfirm(agency)}
                      disabled={agency._count.users > 0}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                      {agency.users.slice(0, 3).map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{user.name || user.email}</span>
                          <Badge variant={user.role === 'AGENCY_ADMIN' ? 'default' : 'secondary'} className="text-xs">
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
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-gray-500">
                    Created: {formatDate(agency.createdAt)}
                  </p>
                  <div className="flex space-x-2">
                    <Link href={`/admin/agencies/${agency.id}/users`}>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Users className="h-3 w-3 mr-1" />
                        Users
                      </Button>
                    </Link>
                    <Link href={`/admin/agencies/${agency.id}/requests`}>
                      <Button variant="outline" size="sm" className="flex-1">
                        <FileText className="h-3 w-3 mr-1" />
                        Requests
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Add/Edit Agency Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgency ? 'Edit Agency' : 'Create New Agency'}</DialogTitle>
            <DialogDescription>
              {editingAgency ? 'Update the agency details.' : 'Set up a new agency for dealership management.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <Input
                name="name"
                placeholder="Agency Name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <Input
                name="domain"
                placeholder="Domain (optional)"
                value={formData.domain}
                onChange={handleInputChange}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{editingAgency ? 'Save Changes' : 'Create Agency'}</Button>
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
              Are you sure you want to delete the agency: <strong>{agencyToDelete?.name}</strong>? 
              This action cannot be undone and will affect all associated users and data.
              {agencyToDelete && agencyToDelete._count.users > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">
                    ⚠️ This agency has {agencyToDelete._count.users} users. Please reassign or remove users before deleting.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAgency}
              disabled={agencyToDelete ? agencyToDelete._count.users > 0 : false}
            >
              Delete Agency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
