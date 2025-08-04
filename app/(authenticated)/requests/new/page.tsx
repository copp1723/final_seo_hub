'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/simple-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PackageType, RequestPriority } from '@prisma/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewRequestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'page',
    priority: 'MEDIUM' as RequestPriority,
    packageType: 'SILVER' as PackageType,
    targetCities: '',
    targetModels: '',
    keywords: '',
    targetUrl: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData,
          targetCities: formData.targetCities ? formData.targetCities.split(',').map(s => s.trim()) : [],
          targetModels: formData.targetModels ? formData.targetModels.split(',').map(s => s.trim()) : [],
          keywords: formData.keywords ? formData.keywords.split(',').map(s => s.trim()) : []
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create request')
      }

      router.push('/requests')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
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
          <CardTitle>Create New Request</CardTitle>
          <CardDescription>
            Submit a new SEO task request for your monthly package (regular priority)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Create blog about Toyota Camry features"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about what you need..."
                rows={4}
                required
              />
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
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
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
                    variant={formData.packageType === pkg ? 'primary' : 'secondary'}
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

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Request'}
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
