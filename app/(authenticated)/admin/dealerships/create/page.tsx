'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Save, Plus, X } from 'lucide-react'
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
  city: string
  state: string
  zipCode: string
  phone: string
  agencyId: string
  activePackageType: 'SILVER' | 'GOLD' | 'PLATINUM'
  clientId: string
  mainBrand: string
  otherBrand: string
  contactName: string
  contactTitle: string
  email: string
  billingEmail: string
  siteAccessNotes: string
  targetVehicleModels: string[]
  targetCities: string[]
  targetDealers: string[]
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
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    agencyId: '',
    activePackageType: 'GOLD',
    clientId: '',
    mainBrand: '',
    otherBrand: '',
    contactName: '',
    contactTitle: '',
    email: '',
    billingEmail: '',
    siteAccessNotes: '',
    targetVehicleModels: [],
    targetCities: [],
    targetDealers: [],
    notes: ''
  })

  // Temporary inputs for array fields
  const [vehicleModelInput, setVehicleModelInput] = useState('')
  const [targetCityInput, setTargetCityInput] = useState('')
  const [targetDealerInput, setTargetDealerInput] = useState('')

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
    
    // Validate required fields
    if (!formData.name || !formData.agencyId || !formData.mainBrand || 
        !formData.city || !formData.state || !formData.zipCode || 
        !formData.contactName || !formData.email) {
      toast.error('Please fill in all required fields')
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
      
      // Show success message with SEOWorks status
      if (result.seoworks?.submitted) {
        toast.success(`Dealership created and submitted to SEOWorks! Client ID: ${result.seoworks.clientId}`)
      } else {
        toast.success('Dealership created successfully! (SEOWorks submission pending)')
      }
      
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

  const handleArrayAdd = (field: 'targetVehicleModels' | 'targetCities' | 'targetDealers', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }))
      
      // Clear the input
      if (field === 'targetVehicleModels') setVehicleModelInput('')
      else if (field === 'targetCities') setTargetCityInput('')
      else if (field === 'targetDealers') setTargetDealerInput('')
    }
  }

  const handleArrayRemove = (field: 'targetVehicleModels' | 'targetCities' | 'targetDealers', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
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
    <div className="space-y-6 max-w-4xl mx-auto">
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
            Enter the details for the new dealership. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
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
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={formData.clientId}
                    onChange={(e) => handleInputChange('clientId', e.target.value)}
                    placeholder="e.g., CLIENT123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mainBrand">Main Brand *</Label>
                  <Input
                    id="mainBrand"
                    value={formData.mainBrand}
                    onChange={(e) => handleInputChange('mainBrand', e.target.value)}
                    placeholder="e.g., Honda"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherBrand">Other Brands</Label>
                  <Input
                    id="otherBrand"
                    value={formData.otherBrand}
                    onChange={(e) => handleInputChange('otherBrand', e.target.value)}
                    placeholder="e.g., Acura, Toyota"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Columbus"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="OH"
                    maxLength={2}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="43215"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactTitle">Contact Title</Label>
                  <Input
                    id="contactTitle"
                    value={formData.contactTitle}
                    onChange={(e) => handleInputChange('contactTitle', e.target.value)}
                    placeholder="General Manager"
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
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@dealership.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingEmail">Billing Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                  placeholder="billing@dealership.com"
                />
              </div>
            </div>

            {/* Target Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Target Markets</h3>
              
              {/* Target Vehicle Models */}
              <div className="space-y-2">
                <Label>Target Vehicle Models</Label>
                <div className="flex gap-2">
                  <Input
                    value={vehicleModelInput}
                    onChange={(e) => setVehicleModelInput(e.target.value)}
                    placeholder="e.g., Honda Accord"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleArrayAdd('targetVehicleModels', vehicleModelInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleArrayAdd('targetVehicleModels', vehicleModelInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.targetVehicleModels.map((model, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="text-sm">{model}</span>
                      <button
                        type="button"
                        onClick={() => handleArrayRemove('targetVehicleModels', index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Cities */}
              <div className="space-y-2">
                <Label>Target Cities</Label>
                <div className="flex gap-2">
                  <Input
                    value={targetCityInput}
                    onChange={(e) => setTargetCityInput(e.target.value)}
                    placeholder="e.g., Columbus"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleArrayAdd('targetCities', targetCityInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleArrayAdd('targetCities', targetCityInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.targetCities.map((city, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="text-sm">{city}</span>
                      <button
                        type="button"
                        onClick={() => handleArrayRemove('targetCities', index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Competitors */}
              <div className="space-y-2">
                <Label>Target Competitor Dealerships</Label>
                <div className="flex gap-2">
                  <Input
                    value={targetDealerInput}
                    onChange={(e) => setTargetDealerInput(e.target.value)}
                    placeholder="e.g., Bob's Honda"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleArrayAdd('targetDealers', targetDealerInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleArrayAdd('targetDealers', targetDealerInput)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.targetDealers.map((dealer, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="text-sm">{dealer}</span>
                      <button
                        type="button"
                        onClick={() => handleArrayRemove('targetDealers', index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Administrative Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Administrative</h3>
              
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
                <Label htmlFor="siteAccessNotes">Site Access Notes</Label>
                <Textarea
                  id="siteAccessNotes"
                  value={formData.siteAccessNotes}
                  onChange={(e) => handleInputChange('siteAccessNotes', e.target.value)}
                  placeholder="Any special instructions for accessing the website or CMS..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about this dealership..."
                  rows={3}
                />
              </div>
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