'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Circle, X, Plus, Building2, Save, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Validation schemas
const dealershipOnboardingSchema = z.object({
  // Basic Information
  name: z.string().min(2, 'Dealership name must be at least 2 characters'),
  website: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
  phone: z.string().optional(),
  
  // Package & Brand Information
  activePackageType: z.enum(['SILVER', 'GOLD', 'PLATINUM']),
  mainBrand: z.string().min(1, 'Main brand is required'),
  otherBrand: z.string().optional(),
  
  // Contact Information
  contactName: z.string().min(2, 'Contact name must be at least 2 characters'),
  contactTitle: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  billingEmail: z.string().email('Please enter a valid billing email').optional().or(z.literal('')),
  
  // Technical Information
  siteAccessNotes: z.string().optional(),
  
  // Target Markets
  targetVehicleModels: z.array(z.string().min(1)).min(3, 'Please add at least 3 vehicle models'),
  targetCities: z.array(z.string().min(1)).min(3, 'Please add at least 3 target cities'),
  targetDealers: z.array(z.string().min(1)).min(3, 'Please add at least 3 competitor dealers'),
  
  // Administrative
  agencyId: z.string().min(1, 'Agency is required'),
  notes: z.string().optional()
})

type DealershipOnboardingData = z.infer<typeof dealershipOnboardingSchema>

interface AgencyDealershipOnboardingProps {
  agencyId: string
  agencyName: string
}


// US States for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// Popular car brands for dropdown
const CAR_BRANDS = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti',
  'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda',
  'Mercedes-Benz', 'MINI', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram',
  'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
]

// Error display component
const FieldError = memo(({ error }: { error?: string }) => {
  if (!error) return null
  return (
    <p className="text-sm text-red-600 mt-1" role="alert">
      {error}
    </p>
  )
})

FieldError.displayName = 'FieldError'

// Array field component for better reusability
interface ArrayFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  error?: string
  helpText?: string
}

const ArrayField = memo(({ label, value, onChange, placeholder, error, helpText }: ArrayFieldProps) => {
  const [inputValue, setInputValue] = useState('')

  const addItem = useCallback(() => {
    if (inputValue.trim()) {
      onChange([...value, inputValue.trim()])
      setInputValue('')
    }
  }, [inputValue, value, onChange])

  const removeItem = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }, [value, onChange])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }, [addItem])

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label} *</Label>
      {helpText && (
        <p className="text-xs text-gray-600">{helpText}</p>
      )}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map((item, index) => (
          <div key={index} className="bg-blue-50 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-blue-600 hover:text-blue-800"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <FieldError error={error} />
    </div>
  )
})

ArrayField.displayName = 'ArrayField'

export default function AgencyDealershipOnboarding({ agencyId, agencyName }: AgencyDealershipOnboardingProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isClient, setIsClient] = useState(false)
  const [formData, setFormData] = useState<DealershipOnboardingData>({
    name: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    activePackageType: 'GOLD',
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
    agencyId,
    notes: ''
  })

  // Auto-save functionality with SSR safety
  const saveKey = `agency-dealership-onboarding-${agencyId}`
  
  // Ensure we're on client side before accessing localStorage
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    
    const savedData = localStorage.getItem(saveKey)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setFormData(prev => ({ ...prev, ...parsed, agencyId }))
      } catch (error) {
        console.error('Failed to parse saved data:', error)
      }
    }
  }, [agencyId, saveKey, isClient])

  useEffect(() => {
    if (!isClient) return
    
    localStorage.setItem(saveKey, JSON.stringify(formData))
  }, [formData, saveKey, isClient])

  const updateField = useCallback((field: keyof DealershipOnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    setErrors(prev => {
      if (prev[field]) {
        const { [field]: removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const validateForm = useCallback((): boolean => {
    const result = dealershipOnboardingSchema.safeParse(formData)
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as string
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return false
    }
    
    setErrors({})
    return true
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors below')
      return
    }

    setIsSubmitting(true)

    try {
      // Clean and normalize website URL if provided
      let websiteUrl = formData.website?.trim() || ''
      if (websiteUrl) {
        // Remove any protocol first to normalize
        websiteUrl = websiteUrl.replace(/^https?:\/\//, '')
        // Add https:// prefix
        websiteUrl = `https://${websiteUrl}`
      }

      const submissionData = {
        ...formData,
        website: websiteUrl,
        clientId: `dealer_${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${formData.city.toLowerCase()}_${new Date().getFullYear()}`
      }

      const response = await fetch('/api/admin/dealerships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create dealership')
      }

      const result = await response.json()

      // Show success message with details
      let message = 'Dealership created successfully!'
      
      if (result.seoworks?.submitted) {
        message += ` Submitted to SEOWorks (Client ID: ${result.seoworks.clientId})`
      } else {
        message += ' (SEOWorks submission pending)'
      }

      if (result.connections?.success) {
        const connections = []
        if (result.connections.ga4Created) connections.push('GA4')
        if (result.connections.searchConsoleCreated) connections.push('Search Console')
        if (connections.length > 0) {
          message += ` | ${connections.join(' & ')} connections created`
        }
      }

      toast.success(message)
      
      // Clear saved data
      if (isClient) {
        localStorage.removeItem(saveKey)
      }
      
      // Redirect to dealership management page
      router.push('/admin/dealerships')
      
    } catch (error: any) {
      console.error('Error creating dealership:', error)
      toast.error(error.message || 'Failed to create dealership')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
            Add New Dealership
          </h1>
          <p className="text-gray-600 mt-2">
            Complete onboarding for {agencyName} - All information will be submitted to SEO fulfillment team
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dealership Onboarding</CardTitle>
          <p className="text-sm text-gray-600">
            Fill out all dealership information. This will create the dealership and immediately submit to SEO fulfillment.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Dealership Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g., Acura of Columbus"
                    required
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  <FieldError error={errors.name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activePackageType">Package Type *</Label>
                  <Select
                    value={formData.activePackageType}
                    onValueChange={(value: 'SILVER' | 'GOLD' | 'PLATINUM') => 
                      updateField('activePackageType', value)
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
                  <FieldError error={errors.activePackageType} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mainBrand">Main Brand *</Label>
                  <Select
                    value={formData.mainBrand}
                    onValueChange={(value) => updateField('mainBrand', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select main brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_BRANDS.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError error={errors.mainBrand} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherBrand">Other Brands</Label>
                  <Input
                    id="otherBrand"
                    value={formData.otherBrand}
                    onChange={(e) => updateField('otherBrand', e.target.value)}
                    placeholder="e.g., Acura, Toyota"
                  />
                  <FieldError error={errors.otherBrand} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://www.dealership.com or www.dealership.com"
                />
                <p className="text-xs text-gray-500">Enter with or without https:// - we'll add it automatically</p>
                <FieldError error={errors.website} />
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Location</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
                <FieldError error={errors.address} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Columbus"
                    required
                  />
                  <FieldError error={errors.city} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => updateField('state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError error={errors.state} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    placeholder="43215"
                    required
                  />
                  <FieldError error={errors.zipCode} />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                  <FieldError error={errors.contactName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactTitle">Contact Title</Label>
                  <Input
                    id="contactTitle"
                    value={formData.contactTitle}
                    onChange={(e) => updateField('contactTitle', e.target.value)}
                    placeholder="General Manager"
                  />
                  <FieldError error={errors.contactTitle} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                  <FieldError error={errors.phone} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="contact@dealership.com"
                    required
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : "email-help"}
                  />
                  <p className="text-xs text-gray-500">Multiple emails: separate with semicolons</p>
                  <FieldError error={errors.email} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingEmail">Billing Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) => updateField('billingEmail', e.target.value)}
                  placeholder="billing@dealership.com"
                />
                <p className="text-xs text-gray-500">Multiple emails: separate with semicolons</p>
                <FieldError error={errors.billingEmail} />
              </div>
            </div>

            {/* Technical Access */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Technical Access</h3>
              
              <div className="space-y-2">
                <Label htmlFor="siteAccessNotes">Site Access Notes</Label>
                <Textarea
                  id="siteAccessNotes"
                  value={formData.siteAccessNotes}
                  onChange={(e) => updateField('siteAccessNotes', e.target.value)}
                  placeholder="Access information for website, CMS, Google Analytics, Search Console, etc."
                  rows={4}
                />
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Include:</strong></p>
                  <p>• Website/CMS login credentials or contact for access</p>
                  <p>• Google Analytics (GA4) access - add agency email as Viewer</p>
                  <p>• Google Business Profile access - add agency email as Manager</p>
                  <p>• Any special technical requirements or restrictions</p>
                </div>
                <FieldError error={errors.siteAccessNotes} />
              </div>
            </div>

            {/* Target Markets */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Target Markets</h3>
              
              <ArrayField
                label="Target Vehicle Models"
                value={formData.targetVehicleModels}
                onChange={(value) => updateField('targetVehicleModels', value)}
                placeholder="e.g., 2024 Honda Accord"
                error={errors.targetVehicleModels}
                helpText="List vehicle models in order of priority (minimum 3 required)"
              />

              <ArrayField
                label="Target Cities"
                value={formData.targetCities}
                onChange={(value) => updateField('targetCities', value)}
                placeholder="e.g., Columbus"
                error={errors.targetCities}
                helpText="Target cities for SEO focus (minimum 3 required)"
              />

              <ArrayField
                label="Target Competitor Dealers"
                value={formData.targetDealers}
                onChange={(value) => updateField('targetDealers', value)}
                placeholder="e.g., Bob's Honda"
                error={errors.targetDealers}
                helpText="Main competitor dealerships to track (minimum 3 required)"
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Any additional notes about this dealership..."
                  rows={3}
                />
                <FieldError error={errors.notes} />
              </div>
            </div>

            {/* Agency Information (Read-only) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Agency</h3>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Agency:</strong> {agencyName}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  This dealership will be created under your agency
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link href="/admin/dealerships">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating & Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Dealership & Submit to SEO Team
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