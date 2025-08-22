'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Circle, Upload, X, Plus } from 'lucide-react'

interface OnboardingData {
  // Dealer Information
  dealerName: string;
  package: 'PLATINUM' | 'GOLD' | 'SILVER';
  mainBrand: string;
  otherBrand: string;

  // Location Details
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Contact Information
  dealerContactName: string;
  dealerContactTitle: string;
  dealerContactEmail: string;
  dealerContactPhone: string;

  // Website & Billing
  dealerWebsiteUrl: string;
  billingContactEmail: string;

  // Access Notes
  siteAccessNotes: string;

  // Target Arrays
  targetVehicleModels: string[];
  targetCities: string[];
  targetDealers: string[];

  // Documents
  documents: File[];
}

const INITIAL_DATA: OnboardingData = {
  dealerName: '',
  package: 'SILVER',
  mainBrand: '',
  otherBrand: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  dealerContactName: '',
  dealerContactTitle: '',
  dealerContactEmail: '',
  dealerContactPhone: '',
  dealerWebsiteUrl: '',
  billingContactEmail: '',
  siteAccessNotes: '',
  targetVehicleModels: ['', '', ''],
  targetCities: ['', '', ''],
  targetDealers: ['', '', ''],
  documents: []
}

const STEPS = [
  { id: 'dealer', title: 'Dealer Information', description: 'Basic dealership details' },
  { id: 'location', title: 'Location & Contact', description: 'Address and contact information' },
  { id: 'website', title: 'Website & Access', description: 'Website and technical access details' },
  { id: 'targets', title: 'Target Markets', description: 'Vehicles, cities, and competitors' },
  { id: 'documents', title: 'Documents & Submit', description: 'Supporting files and final submission' }
]

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

export default function DealershipOnboardingForm() {
  const searchParams = useSearchParams()
  const invitedUserId = searchParams.get('token') // User ID from invitation URL
  const isInvited = searchParams.get('invited') === 'true' // Flag to indicate this is from invitation
  
  const [currentStep, setCurrentStep] = useState('dealer')
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('dealer-onboarding-data')
    const savedStep = localStorage.getItem('dealer-onboarding-step')
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setFormData({ ...INITIAL_DATA, ...parsed, documents: [] }) // Reset files on reload
      } catch (error) {
        console.error('Failed to parse saved data:', error)
      }
    }
    
    if (savedStep) {
      setCurrentStep(savedStep)
    }
  }, [])

  // Save data to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem('dealer-onboarding-data', JSON.stringify(formData))
    localStorage.setItem('dealer-onboarding-step', currentStep)
  }, [formData, currentStep])

  const updateField = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateArrayField = (field: 'targetVehicleModels' | 'targetCities' | 'targetDealers', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field: 'targetVehicleModels' | 'targetCities' | 'targetDealers') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayItem = (field: 'targetVehicleModels' | 'targetCities' | 'targetDealers', index: number) => {
    if (formData[field].length > 3) { // Don't allow removing below minimum
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
    }
  }

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        // Validate file type and size (max 10MB)
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024
      })
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...newFiles]
      }))
    }
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (step: string): boolean => {
    switch (step) {
      case 'dealer':
        return !!(formData.dealerName && formData.package && formData.mainBrand)
      case 'location':
        return !!(formData.address && formData.city && formData.state && formData.zipCode && 
                 formData.dealerContactName && formData.dealerContactTitle && 
                 formData.dealerContactEmail && formData.dealerContactPhone)
      case 'website':
        return !!(formData.dealerWebsiteUrl && formData.billingContactEmail)
      case 'targets':
        return formData.targetVehicleModels.filter(v => v.trim()).length >= 3 &&
               formData.targetCities.filter(c => c.trim()).length >= 3 &&
               formData.targetDealers.filter(d => d.trim()).length >= 3
      default:
        return true
    }
  }

  const goToStep = (step: string) => {
    setCurrentStep(step)
  }

  const nextStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    if (currentIndex < STEPS.length - 1) {
      const isValid = validateStep(currentStep)
      if (isValid) {
        setCompletedSteps(prev => [...new Set([...prev, currentStep])])
        setCurrentStep(STEPS[currentIndex + 1].id)
      } else {
        setSubmitStatus({
          type: 'error',
          message: 'Please complete all required fields before proceeding.'
        })
      }
    }
  }

  const prevStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  const handleSubmit = async () => {
    // Validate all steps
    const allStepsValid = STEPS.slice(0, -1).every(step => validateStep(step.id))
    
    if (!allStepsValid) {
      setSubmitStatus({
        type: 'error',
        message: 'Please complete all required fields in all steps before submitting.'
      })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      // Transform data to match our backend integration API format
      const onboardingData = {
        businessName: formData.dealerName,
        clientEmail: formData.dealerContactEmail,
        package: formData.package,
        mainBrand: formData.mainBrand,
        otherBrand: formData.otherBrand,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        contactName: formData.dealerContactName,
        contactTitle: formData.dealerContactTitle,
        phone: formData.dealerContactPhone,
        websiteUrl: formData.dealerWebsiteUrl,
        billingEmail: formData.billingContactEmail,
        siteAccessNotes: formData.siteAccessNotes,
        targetVehicleModels: formData.targetVehicleModels.filter(Boolean),
        targetCities: formData.targetCities.filter(Boolean),
        targetDealers: formData.targetDealers.filter(Boolean),
        ...(isInvited && invitedUserId ? { userId: invitedUserId } : {})
      }

      // Use different endpoint for invited users vs standalone onboarding
      const apiEndpoint = isInvited && invitedUserId
        ? '/api/seoworks/complete-onboarding'
        : '/api/seoworks/send-onboarding'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData)
      })

      if (response.ok) {
        const result = await response.json()
        
        if (isInvited && invitedUserId) {
          // For invited users, show success and redirect to dashboard
          setSubmitStatus({
            type: 'success',
            message: 'Onboarding completed successfully! You can now access your SEO dashboard. Redirecting...'
          })
          
          // Clear saved data
          localStorage.removeItem('dealer-onboarding-data')
          localStorage.removeItem('dealer-onboarding-step')
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 2000)
        } else {
          // For standalone onboarding
          setSubmitStatus({
            type: 'success',
            message: 'Onboarding submitted successfully! Your dealership has been registered and setup will begin shortly.'
          })
          
          // Clear saved data on successful submission
          localStorage.removeItem('dealer-onboarding-data')
          localStorage.removeItem('dealer-onboarding-step')
          
          // Reset form
          setFormData(INITIAL_DATA)
          setCurrentStep('dealer')
          setCompletedSteps([])
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Submission failed')
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSinglePageForm = () => (
    <div className="max-w-4xl mx-auto bg-gray-800 text-white p-8 rounded-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-blue-400">SEO</span>
          <span className="text-black bg-white px-1">Werks</span>
          <span className="text-blue-400">.ai</span>
        </h1>
        <h2 className="text-xl text-gray-300">Onboarding</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Dealer Name, Package, Main Brand, Other */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="dealerName" className="text-white">Dealer Name</Label>
            <Input
              id="dealerName"
              value={formData.dealerName}
              onChange={(e) => updateField('dealerName', e.target.value)}
              placeholder="Enter dealer name"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="package" className="text-white">Package</Label>
            <select
              id="package"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              value={formData.package}
              onChange={(e) => updateField('package', e.target.value)}
              required
            >
              <option value="">Please select</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
          </div>

          <div>
            <Label htmlFor="mainBrand" className="text-white">Select Main Brand You Sell</Label>
            <select
              id="mainBrand"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              value={formData.mainBrand}
              onChange={(e) => updateField('mainBrand', e.target.value)}
              required
            >
              <option value="">Please select</option>
              {CAR_BRANDS.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="otherBrand" className="text-white">Other Brand</Label>
            <Input
              id="otherBrand"
              value={formData.otherBrand}
              onChange={(e) => updateField('otherBrand', e.target.value)}
              placeholder="Other Brand"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Row 2: Address, City, State, Zip Code */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="address" className="text-white">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Address"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="city" className="text-white">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="City"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="state" className="text-white">State</Label>
            <select
              id="state"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              required
            >
              <option value="">Please select</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="zipCode" className="text-white">Zip Code</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
              placeholder="Zip Code"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
        </div>

        {/* Row 3: Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="dealerContactName" className="text-white">Dealer Contact Name</Label>
            <Input
              id="dealerContactName"
              value={formData.dealerContactName}
              onChange={(e) => updateField('dealerContactName', e.target.value)}
              placeholder="Contact Name"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="dealerContactTitle" className="text-white">Dealer Contact Title</Label>
            <Input
              id="dealerContactTitle"
              value={formData.dealerContactTitle}
              onChange={(e) => updateField('dealerContactTitle', e.target.value)}
              placeholder="Contact Title"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="dealerContactEmail" className="text-white">Dealer Contact Email</Label>
            <Input
              id="dealerContactEmail"
              type="email"
              value={formData.dealerContactEmail}
              onChange={(e) => updateField('dealerContactEmail', e.target.value)}
              placeholder="Multi Emails put ; between"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="dealerContactPhone" className="text-white">Dealer Contact Phone</Label>
            <Input
              id="dealerContactPhone"
              value={formData.dealerContactPhone}
              onChange={(e) => updateField('dealerContactPhone', e.target.value)}
              placeholder="Contact Phone"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
        </div>

        {/* Row 4: Website and Billing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dealerWebsiteUrl" className="text-white">Dealer Website URL</Label>
            <Input
              id="dealerWebsiteUrl"
              type="url"
              value={formData.dealerWebsiteUrl}
              onChange={(e) => updateField('dealerWebsiteUrl', e.target.value)}
              placeholder="Website URL"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="billingContactEmail" className="text-white">Billing Contact Email</Label>
            <Input
              id="billingContactEmail"
              type="email"
              value={formData.billingContactEmail}
              onChange={(e) => updateField('billingContactEmail', e.target.value)}
              placeholder="Multi Emails put ; between"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
        </div>

        {/* Access Notes Section */}
        <div className="space-y-4">
          <div className="text-white space-y-2">
            <p><strong>1. Need site access (full access, metadata, seo) and blog access:</strong> please provide us a login or create a new one under agency email. Or, we can email website provider asking them for access, and cc you for approval. Let me know what you prefer.</p>
          </div>

          <div>
            <Label htmlFor="siteAccessNotes" className="text-white">Access Notes</Label>
            <Textarea
              id="siteAccessNotes"
              value={formData.siteAccessNotes}
              onChange={(e) => updateField('siteAccessNotes', e.target.value)}
              placeholder="Access Notes"
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div className="text-white space-y-2">
            <p><strong>2. Google Business Profile access:</strong> add agency email as a Manager.</p>
            <p><strong>3. Google Analytics (GA4) access, Viewer only access is fine:</strong> add agency email.</p>
          </div>
        </div>

        {/* Target Sections */}
        <div className="space-y-6">
          {/* Target Vehicle Models */}
          <div>
            <Label className="text-white text-lg">Overall Target Vehicle Models (in order of priority, add at least 3)</Label>
            <div className="space-y-2 mt-2">
              {formData.targetVehicleModels.map((model, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={model}
                    onChange={(e) => updateArrayField('targetVehicleModels', index, e.target.value)}
                    placeholder={`Vehicle Model ${index + 1}`}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  {index >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('targetVehicleModels', index)}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('targetVehicleModels')}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            </div>
          </div>

          {/* Target Cities */}
          <div>
            <Label className="text-white text-lg">Overall Target Cities (in order of priority, add at least 3)</Label>
            <div className="space-y-2 mt-2">
              {formData.targetCities.map((city, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={city}
                    onChange={(e) => updateArrayField('targetCities', index, e.target.value)}
                    placeholder={`Target City ${index + 1}`}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  {index >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('targetCities', index)}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('targetCities')}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Cities
              </Button>
            </div>
          </div>

          {/* Target Dealers */}
          <div>
            <Label className="text-white text-lg">Overall Target Dealers (in order of priority, add at least 3)</Label>
            <div className="space-y-2 mt-2">
              {formData.targetDealers.map((dealer, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={dealer}
                    onChange={(e) => updateArrayField('targetDealers', index, e.target.value)}
                    placeholder={`Target Dealer ${index + 1}`}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  {index >= 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('targetDealers', index)}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('targetDealers')}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Dealer
              </Button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>

        {/* Submit Status */}
        {submitStatus && (
          <Alert className={`mt-4 ${submitStatus.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <AlertDescription className={submitStatus.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {submitStatus.message}
            </AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  )

  const renderLocationStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Location & Contact Information</CardTitle>
        <p className="text-sm text-gray-600">Dealership location and primary contact details</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Address"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="City"
              required
            />
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <select
              id="state"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
              required
            >
              <option value="">Please select</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="zipCode">Zip Code *</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => updateField('zipCode', e.target.value)}
              placeholder="Zip Code"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dealerContactName">Dealer Contact Name *</Label>
            <Input
              id="dealerContactName"
              value={formData.dealerContactName}
              onChange={(e) => updateField('dealerContactName', e.target.value)}
              placeholder="Contact Name"
              required
            />
          </div>
          <div>
            <Label htmlFor="dealerContactTitle">Dealer Contact Title *</Label>
            <Input
              id="dealerContactTitle"
              value={formData.dealerContactTitle}
              onChange={(e) => updateField('dealerContactTitle', e.target.value)}
              placeholder="Contact Title"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dealerContactEmail">Dealer Contact Email *</Label>
            <Input
              id="dealerContactEmail"
              type="email"
              value={formData.dealerContactEmail}
              onChange={(e) => updateField('dealerContactEmail', e.target.value)}
              placeholder="Multi Emails put ; between"
              required
            />
          </div>
          <div>
            <Label htmlFor="dealerContactPhone">Dealer Contact Phone *</Label>
            <Input
              id="dealerContactPhone"
              type="tel"
              value={formData.dealerContactPhone}
              onChange={(e) => updateField('dealerContactPhone', e.target.value)}
              placeholder="Contact Phone"
              required
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderWebsiteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Website & Access Information</CardTitle>
        <p className="text-sm text-gray-600">Website details and access requirements</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="dealerWebsiteUrl">Dealer Website URL *</Label>
          <Input
            id="dealerWebsiteUrl"
            type="url"
            value={formData.dealerWebsiteUrl}
            onChange={(e) => updateField('dealerWebsiteUrl', e.target.value)}
            placeholder="Website URL"
            required
          />
        </div>

        <div>
          <Label htmlFor="billingContactEmail">Billing Contact Email *</Label>
          <Input
            id="billingContactEmail"
            type="email"
            value={formData.billingContactEmail}
            onChange={(e) => updateField('billingContactEmail', e.target.value)}
            placeholder="Multi Emails put ; between"
            required
          />
        </div>

        <div>
          <Label htmlFor="siteAccessNotes">Site Access Notes</Label>
          <Textarea
            id="siteAccessNotes"
            value={formData.siteAccessNotes}
            onChange={(e) => updateField('siteAccessNotes', e.target.value)}
            placeholder={`1. Need site access (full access, metadata, seo) and blog access: please provide us a login or create a new one under agency email. Or, we can email website provider asking them for access, and cc you for approval. Let me know what you prefer.

2. Google Business Profile access: add agency email as a Manager.

3. Google Analytics (GA4) access. Viewer only access is fine: add agency email.`}
            rows={8}
          />
        </div>
      </CardContent>
    </Card>
  )

  const renderTargetsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Target Markets</CardTitle>
        <p className="text-sm text-gray-600">
          Define your target vehicle models, cities, and competitor dealers (minimum 3 each, in order of priority)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Vehicle Models */}
        <div>
          <Label>Overall Target Vehicle Models (in order of priority, add at least 3) *</Label>
          <div className="space-y-2 mt-2">
            {formData.targetVehicleModels.map((vehicle, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={vehicle}
                  onChange={(e) => updateArrayField('targetVehicleModels', index, e.target.value)}
                  placeholder={`Vehicle model ${index + 1} (e.g., "2024 Toyota Camry")`}
                  className="flex-1"
                />
                {formData.targetVehicleModels.length > 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem('targetVehicleModels', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('targetVehicleModels')}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Model
            </Button>
          </div>
        </div>

        {/* Target Cities */}
        <div>
          <Label>Overall Target Cities (in order of priority, add at least 3) *</Label>
          <div className="space-y-2 mt-2">
            {formData.targetCities.map((city, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={city}
                  onChange={(e) => updateArrayField('targetCities', index, e.target.value)}
                  placeholder={`Target city ${index + 1}`}
                  className="flex-1"
                />
                {formData.targetCities.length > 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem('targetCities', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('targetCities')}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Cities
            </Button>
          </div>
        </div>

        {/* Target Dealers */}
        <div>
          <Label>Overall Target Dealers (in order of priority, add at least 3) *</Label>
          <div className="space-y-2 mt-2">
            {formData.targetDealers.map((dealer, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={dealer}
                  onChange={(e) => updateArrayField('targetDealers', index, e.target.value)}
                  placeholder={`Target dealer ${index + 1}`}
                  className="flex-1"
                />
                {formData.targetDealers.length > 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem('targetDealers', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('targetDealers')}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Dealer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supporting Documents (Optional)</CardTitle>
          <p className="text-sm text-gray-600">Upload any supporting documents for your onboarding</p>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Upload supporting documents
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  PDF, Word, or image files up to 10MB each
                </span>
              </Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </div>
          
          {formData.documents.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>Uploaded Files:</Label>
              {formData.documents.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{file.name}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>Review Your Information</CardTitle>
          <p className="text-sm text-gray-600">
            Please review all information before submitting
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Dealer Information</h4>
              <p><strong>Dealer Name:</strong> {formData.dealerName}</p>
              <p><strong>Package:</strong> {formData.package}</p>
              <p><strong>Main Brand:</strong> {formData.mainBrand}</p>
              {formData.otherBrand && (
                <p><strong>Other Brand:</strong> {formData.otherBrand}</p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Contact Information</h4>
              <p><strong>Contact:</strong> {formData.dealerContactName} ({formData.dealerContactTitle})</p>
              <p><strong>Email:</strong> {formData.dealerContactEmail}</p>
              <p><strong>Phone:</strong> {formData.dealerContactPhone}</p>
              <p><strong>Address:</strong> {formData.address}, {formData.city}, {formData.state} {formData.zipCode}</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Website & Billing</h4>
            <p><strong>Website:</strong> {formData.dealerWebsiteUrl}</p>
            <p><strong>Billing Email:</strong> {formData.billingContactEmail}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Target Vehicle Models</h4>
              <ul className="text-sm space-y-1">
                {formData.targetVehicleModels.filter(Boolean).map((vehicle, index) => (
                  <li key={index}>• {vehicle}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Target Cities</h4>
              <ul className="text-sm space-y-1">
                {formData.targetCities.filter(Boolean).map((city, index) => (
                  <li key={index}>• {city}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Target Dealers</h4>
              <ul className="text-sm space-y-1">
                {formData.targetDealers.filter(Boolean).map((dealer, index) => (
                  <li key={index}>• {dealer}</li>
                ))}
              </ul>
            </div>
          </div>

          {formData.documents.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Supporting Documents</h4>
              <ul className="text-sm space-y-1">
                {formData.documents.map((file, index) => (
                  <li key={index}>• {file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {renderSinglePageForm()}
      </div>
    </div>
  )
}