'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Building2, Target, Rocket } from 'lucide-react'

const steps = [
  { id: 1, name: 'Business Info', icon: Building2, description: 'Tell us about your dealership' },
  { id: 2, name: 'SEO Goals', icon: Target, description: 'What do you want to achieve?' },
  { id: 3, name: 'Get Started', icon: Rocket, description: 'Complete your setup' },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    websiteUrl: '',
    package: '',
    targetCities: '',
    targetModels: '',
    goals: ''
  })

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.businessName && formData.email && formData.websiteUrl)
      case 1:
        return !!(formData.package && formData.targetCities && formData.goals)
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
      setError('')
    } else {
      setError('Please fill in all required fields')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
    setError('')
  }

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      setError('Please complete all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: formData.businessName,
          clientEmail: formData.email,
          phone: formData.phone,
          websiteUrl: formData.websiteUrl,
          package: formData.package,
          targetCities: formData.targetCities.split(',').map(s => s.trim()),
          targetVehicleModels: formData.targetModels.split(',').map(s => s.trim()),
          goals: formData.goals
        })
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete onboarding')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName">Dealership Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                placeholder="e.g., Smith Honda"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="websiteUrl">Website URL *</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => updateField('websiteUrl', e.target.value)}
                placeholder="https://yourdealership.com"
                required
              />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="package">SEO Package *</Label>
              <Select value={formData.package} onValueChange={(value) => updateField('package', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SILVER">Silver - Basic SEO</SelectItem>
                  <SelectItem value="GOLD">Gold - Enhanced SEO</SelectItem>
                  <SelectItem value="PLATINUM">Platinum - Premium SEO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetCities">Target Cities *</Label>
              <Input
                id="targetCities"
                value={formData.targetCities}
                onChange={(e) => updateField('targetCities', e.target.value)}
                placeholder="Austin, San Antonio, Houston"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple cities with commas</p>
            </div>
            <div>
              <Label htmlFor="targetModels">Popular Vehicle Models</Label>
              <Input
                id="targetModels"
                value={formData.targetModels}
                onChange={(e) => updateField('targetModels', e.target.value)}
                placeholder="Honda Civic, Toyota Camry, Ford F-150"
              />
              <p className="text-xs text-gray-500 mt-1">Your most popular models (optional)</p>
            </div>
            <div>
              <Label htmlFor="goals">SEO Goals *</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => updateField('goals', e.target.value)}
                placeholder="What do you want to achieve with SEO? (e.g., increase website traffic, generate more leads, improve local search rankings)"
                rows={3}
                required
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">You're all set!</h3>
              <p className="text-gray-600">
                We'll review your information and start setting up your SEO campaign.
                You'll receive an email confirmation shortly.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h4 className="font-medium mb-2">What happens next:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Our team will review your goals and website</li>
                <li>• We'll create your custom SEO strategy</li>
                <li>• You'll get access to your dashboard within 24 hours</li>
                <li>• We'll start working on your first SEO tasks</li>
              </ul>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome to SEO Hub
          </CardTitle>
          <p className="text-center text-gray-600 mt-2">
            Let's get your dealership set up for SEO success
          </p>
          
          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === index
                const isCompleted = currentStep > index
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isCompleted ? 'bg-green-100 border-green-500' :
                      isActive ? 'bg-blue-100 border-blue-500' :
                      'bg-gray-100 border-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Icon className={`w-5 h-5 ${
                          isActive ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : 
                        isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {step.description}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`hidden sm:block absolute top-5 w-full h-0.5 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`} style={{ left: '50%', width: 'calc(100% - 2.5rem)' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {renderStep()}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </CardContent>
        
        <div className="flex justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0 || loading}
          >
            Previous
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={nextStep} disabled={loading}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
