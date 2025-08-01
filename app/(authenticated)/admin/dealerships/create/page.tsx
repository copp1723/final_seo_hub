'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/simple-auth-provider'

interface Agency {
  id: string
  name: string
}

interface DealershipForm {
  name: string
  website: string
  address: string
  phone: string
  agencyId: string
  activePackageType: 'SILVER' | 'GOLD' | 'PLATINUM'
  notes: string
}

export default function CreateDealershipPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<DealershipForm>({
    name: '',
    website: '',
    address: '',
    phone: '',
    agencyId: '',
    activePackageType: 'GOLD',
    notes: ''
  })

  useEffect(() => {
    if (!user) return
    
    if (user.role !== 'SUPER_ADMIN') {
      router.push('/admin')
      return
    }

    fetchAgencies()
  }, [user, router])

  const fetchAgencies = async () => {
    try {
      const response = await fetch('/api/admin/agencies')
      if (!response.ok) throw new Error('Failed to fetch agencies')
      
      const data = await response.json()
      setAgencies(data.agencies || [])
    } catch (error) {
      console.error('Error fetching agencies:', error)
      toast.error('Failed to load agencies')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.agencyId) {
      toast.error('Please fill in required fields')
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/admin/dealerships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create dealership')
      }

      const result = await response.json()
      toast.success('Dealership created successfully!')
      
      // Redirect to dealership management page
      router.push('/admin/dealerships')
      
    } catch (error: any) {
      console.error('Error creating dealership:', error)
      toast.error(error.message || 'Failed to create dealership')
    } finally {
      setCreating(false)
    }
  }

  const handleInputChange = (field: keyof DealershipForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/dealerships">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dealerships
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="mr-3 h-8 w-8" />
            Create New Dealership
          </h1>
          <p className="text-gray-600 mt-2">Add a new dealership to the platform</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dealership Information</CardTitle>
          <CardDescription>
            Enter the details for the new dealership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Dealership Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Acura of Columbus"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.dealership.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package">Package Type</Label>
                <Select
                  value={formData.activePackageType}
                  onValueChange={(value: 'SILVER' | 'GOLD' | 'PLATINUM') => 
                    handleInputChange('activePackageType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="PLATINUM">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main Street, City, State 12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agency">Agency *</Label>
              <Select
                value={formData.agencyId}
                onValueChange={(value) => handleInputChange('agencyId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agency" />
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this dealership..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link href="/admin/dealerships">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Dealership
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
