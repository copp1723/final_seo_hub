'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PackageType, RequestStatus } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading'
import { calculatePackageProgress, getPackageTotalTasks } from '@/lib/package-utils'
import { FileText, Globe, MessageSquare, Wrench, Plus, ExternalLink } from 'lucide-react'

interface Request {
  id: string
  title: string
  description: string
  type: string
  status: RequestStatus
  priority: string
  packageType?: PackageType
  pagesCompleted: number
  blogsCompleted: number
  gbpPostsCompleted: number
  improvementsCompleted: number
  completedTasks?: any[]
  targetCities?: string[]
  targetModels?: string[]
  createdAt: string
  completedAt?: string
}

export default function RequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchRequests()
  }, [session, status, router])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/requests')
      const data = await response.json()
      if (data.success) {
        setRequests(data.data.requests)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: RequestStatus) => {
    switch (status) {
      case 'COMPLETED': return 'success'
      case 'IN_PROGRESS': return 'warning'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'page': return <FileText className="h-4 w-4" />
      case 'blog': return <MessageSquare className="h-4 w-4" />
      case 'gbp_post': return <Globe className="h-4 w-4" />
      default: return <Wrench className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const activeRequests = requests.filter(r => r.packageType)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Track your monthly SEO package progress</p>
        </div>
        <Link href="/requests/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {activeRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No active SEO packages"
              description="Start by submitting your target cities, models, and dealers during onboarding"
              action={
                <Button variant="primary">
                  Complete Onboarding
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeRequests.map((request) => {
            const progress = request.packageType 
              ? calculatePackageProgress(
                  request.packageType,
                  request.pagesCompleted,
                  request.blogsCompleted,
                  request.gbpPostsCompleted,
                  request.improvementsCompleted
                )
              : null

            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge>{request.packageType}</Badge>
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {progress?.totalTasks.completed || 0} / {progress?.totalTasks.total || 0}
                      </p>
                      <p className="text-sm text-gray-600">tasks completed</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Current Targets Section */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Current Targets</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Cities: </span>
                        <span>{request.targetCities?.join(', ') || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Models: </span>
                        <span>{request.targetModels?.join(', ') || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  {progress && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Pages
                          </span>
                          <span>{progress.pages.completed} of {progress.pages.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.pages.completed / progress.pages.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Blogs
                          </span>
                          <span>{progress.blogs.completed} of {progress.blogs.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.blogs.completed / progress.blogs.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> GBP Posts
                          </span>
                          <span>{progress.gbpPosts.completed} of {progress.gbpPosts.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.gbpPosts.completed / progress.gbpPosts.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" /> SEO Improvements
                          </span>
                          <span>{progress.improvements.completed} of {progress.improvements.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(progress.improvements.completed / progress.improvements.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Completed Tasks */}
                  {request.completedTasks && request.completedTasks.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-2">Completed Tasks</h3>
                      <div className="space-y-2">
                        {request.completedTasks.slice(0, 5).map((task, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(task.type)}
                              <span>{task.title}</span>
                            </div>
                            <a 
                              href={task.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                        {request.completedTasks.length > 5 && (
                          <Button variant="ghost" size="sm" className="w-full">
                            View all {request.completedTasks.length} completed tasks
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active Tasks Count */}
                  {progress && (
                    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                      Active tasks: {progress.totalTasks.total - progress.totalTasks.completed}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}