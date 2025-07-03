'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PackageType, RequestPriority } from '@prisma/client'
import { ArrowLeft, Target, Zap } from 'lucide-react'
import Link from 'next/link'

export default function FocusRequestPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'page',
    priority: 'HIGH' as RequestPriority, // Default to HIGH for focus requests
    packageType: 'GOLD' as PackageType,
    targetCities: '',
    targetModels: '',
    keywords: '',
    targetUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // First create the request
      const requestResponse = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetCities: formData.targetCities ? formData.targetCities.split(',').map(s => s.trim()) : [],
          targetModels: formData.targetModels ? formData.targetModels.split(',').map(s => s.trim()) : [],
          keywords: formData.keywords ? formData.keywords.split(',').map(s => s.trim()) : [],
        }),
      })

      if (!requestResponse.ok) {
        throw new Error('Failed to create request')
      }

      const requestData = await requestResponse.json()
      const requestId = requestData.data.id

      // Then send it to SEOWorks as a focus request
      const focusResponse = await fetch('/api/seoworks/send-focus-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })

      if (!focusResponse.ok) {
        throw new Error('Failed to send focus request to SEOWorks')
      }

      const focusData = await focusResponse.json()
      
      setSuccess(`Focus request "${formData.title}" has been sent to SEOWorks successfully!`)
      
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
        targetUrl: '',
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
            Submit a high-priority SEO task that will be sent directly to SEOWorks for immediate attention
          </CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              High Priority
            </Badge>
            <Badge variant="outline">Direct to SEOWorks</Badge>
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
              />
              <p className="text-xs text-gray-500 mt-1">Be specific about your requirements and timeline</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
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
              />
              <p className="text-xs text-gray-500 mt-1">Include state codes (City, State). Include cities in neighboring states if relevant.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Models (comma-separated)</label>
              <input
                type="text"
                value={formData.targetModels}
                onChange={(e) => setFormData({ ...formData, targetModels: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Toyota Camry, Honda Accord, Nissan Altima"
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
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">Focus Request Benefits:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Sent directly to SEOWorks for immediate attention</li>
                <li>• Higher priority in the work queue</li>
                <li>• Faster turnaround time</li>
                <li>• Direct communication with SEO specialists</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {loading ? 'Sending Focus Request...' : 'Send Focus Request'}
              </Button>
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