'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/simple-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PackageType, RequestPriority } from '@prisma/client'
import { ArrowLeft, Target, Zap } from 'lucide-react'
import Link from 'next/link'
import { useCSRF } from '@/hooks/useCSRF'

export default function FocusRequestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { secureRequest } = useCSRF()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requestCount, setRequestCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'page',
    priority: 'HIGH' as RequestPriority, // Default to HIGH for focus requests
    packageType: 'GOLD' as PackageType,
    targetCities: '',
    targetModels: '',
    keywords: '',
    targetUrl: ''
  })

  // Fetch current month's request count
  useEffect(() => {
    const fetchRequestCount = async () => {
      if (!user?.id) return
      
      const now = new Date()
      const month = now.getMonth() + 1 // 1-based month
      const year = now.getFullYear()
      
      try {
        const response = await fetch(`/api/requests/count?userId=${user.id}&month=${month}&year=${year}&type=all`)
        if (response.ok) {
          const data = await response.json()
          setRequestCount(data.data?.count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch request count:', err)
      } finally {
        setLoadingCount(false)
      }
    }

    fetchRequestCount()
  }, [user?.id])

  const isAtLimit = requestCount >= 2
  const remainingRequests = Math.max(0, 2 - requestCount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isAtLimit) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Prepare request data
      const requestPayload = {
        ...formData,
        targetCities: formData.targetCities ? formData.targetCities.split(',').map(s => s.trim()) : [],
        targetModels: formData.targetModels ? formData.targetModels.split(',').map(s => s.trim()) : [],
        keywords: formData.keywords ? formData.keywords.split(',').map(s => s.trim()) : []
      }

      console.log('Focus Request - Sending request data:', requestPayload)

      // First create the request
      const requestResponse = await secureRequest('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      })

      console.log('Focus Request - Response status:', requestResponse.status)

      if (!requestResponse.ok) {
        const errorData = await requestResponse.json()
        console.error('Focus Request - API Error:', errorData)
        throw new Error(errorData.error || 'Failed to create request')
      }

      const requestData = await requestResponse.json()
      console.log('Focus Request - Full API response:', requestData)
      
      // The correct path is requestData.data.requests.id based on successResponse structure
      const requestId = requestData.data?.requests.id
      console.log('Focus Request - Extracted requestId:', requestId)
      
      if (!requestId) {
        console.error('Focus Request - Could not extract requestId from response:', requestData)
        throw new Error('Could not extract request ID from response')
      }

      // Skip SEOWorks integration for now - it's causing issues
      // The request has been created successfully
      console.log('Focus Request - Request created successfully, skipping SEOWorks integration')
      
      setSuccess(`Focus request "${formData.title}" has been submitted successfully!`)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'page',
        priority: 'HIGH',
        packageType: 'GOLD',
        targetCities: '',
        targetModels: '',
        keywords: '',
        targetUrl: ''
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/requests')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit focus request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/requests" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Requests
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Create Focus Request
          </CardTitle>
          <CardDescription>
            Submit a high-priority SEO task for immediate attention
          </CardDescription>
          
          {/* Monthly Usage Indicator */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Monthly Focus Requests: {loadingCount ? '...' : `${requestCount} / 2 used`}
              </span>
              {!loadingCount && (
                <Badge variant={isAtLimit ? "destructive" : remainingRequests === 1 ? "warning" : "default"}>
                  {isAtLimit ? 'Limit Reached' : `${remainingRequests} remaining`}
                </Badge>
              )}
            </div>
            {isAtLimit && (
              <p className="text-xs text-blue-700 mt-1">
                Limit resets at the start of next month
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              High Priority
            </Badge>
            <Badge variant="outline">Priority Processing</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Urgent: Create landing page for Toyota Camry promotion"
                required
                disabled={isAtLimit}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed requirements for this focus request..."
                rows={4}
                required
                minLength={10}
                disabled={isAtLimit}
                className={`${formData.description.length > 0 && formData.description.length < 10 ? 'border-red-300' : ''}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Be specific about your requirements and timeline (minimum 10 characters)
                {formData.description.length > 0 && (
                  <span className={`ml-2 ${formData.description.length < 10 ? 'text-red-500' : 'text-green-500'}`}>
                    {formData.description.length}/10
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  disabled={isAtLimit}
                >
                  <option value="page">Page</option>
                  <option value="blog">Blog</option>
                  <option value="gbp_post">GBP Post</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as RequestPriority })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  disabled={isAtLimit}
                >
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Package Type</label>
              <div className="flex gap-2">
                {(['SILVER', 'GOLD', 'PLATINUM'] as PackageType[]).map((pkg) => (
                  <Button
                    key={pkg}
                    type="button"
                    variant={formData.packageType === pkg ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, packageType: pkg })}
                    disabled={isAtLimit}
                  >
                    {pkg}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Cities (comma-separated)</label>
              <input
                type="text"
                value={formData.targetCities}
                onChange={(e) => setFormData({ ...formData, targetCities: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Austin, TX, San Antonio, TX, Oklahoma City, OK"
                disabled={isAtLimit}
              />
              <p className="text-xs text-gray-500 mt-1">Include state codes (City, State). Include cities in neighboring states if relevant</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Models (comma-separated)</label>
              <input
                type="text"
                value={formData.targetModels}
                onChange={(e) => setFormData({ ...formData, targetModels: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Toyota Camry, Honda Accord, Nissan Altima"
                disabled={isAtLimit}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., best family sedan, fuel efficient cars"
                disabled={isAtLimit}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target URL (optional)</label>
              <input
                type="url"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="https://example.com/page"
                disabled={isAtLimit}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">Focus Request Benefits:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Immediate attention and priority processing</li>
                <li>• Higher priority in the work queue</li>
                <li>• Faster turnaround time</li>
                <li>• Direct communication with SEO specialists</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              {isAtLimit ? (
                <div className="w-full p-4 bg-gray-100 border border-gray-300 rounded-md text-center">
                  <p className="text-gray-600 font-medium">
                    You've reached the maximum of 2 Focus Requests for this month</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your limit will reset on the 1st of next month</p>
                </div>
              ) : (
                <Button type="submit" disabled={loading} className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {loading ? 'Sending Focus Request...' : 'Send Focus Request'}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => router.push('/requests')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
