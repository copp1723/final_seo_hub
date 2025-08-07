'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useDealership } from '@/app/context/DealershipContext'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { PackageType, RequestStatus } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading'
import { calculatePackageProgress } from '@/lib/package-utils'
import { FileText, Globe, MessageSquare, Wrench, Plus, ExternalLink, Filter, ListRestart, ArrowUpDown } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DealershipSelector } from '@/components/layout/dealership-selector'

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
  const { user, isLoading } = useAuth()
  const { currentDealership } = useDealership()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  // State for filters and sorting, initialized from URL or defaults
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')

  const createQueryString = useCallback(
    (paramsToUpdate: Record<string, string | null>) => {
      const currentParams = new URLSearchParams(searchParams.toString())
      Object.entries(paramsToUpdate).forEach(([name, value]) => {
        if (value === null || value === 'all' || value === '') {
          currentParams.delete(name)
        } else {
          currentParams.set(name, value)
        }
      })
      return currentParams.toString()
    },
    [searchParams]
  )

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const query = createQueryString({
        search: searchQuery,
        status: statusFilter,
        type: typeFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
        dealershipId: currentDealership?.id || null
      })
      const response = await fetch(`/api/requests?${query}`)
      const data = await response.json()
      if (data.success) {
        setRequests(data.data.requests || [])
      } else {
        console.error('Failed to fetch requests:', data.error)
        setRequests([])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, typeFilter, sortBy, sortOrder, currentDealership?.id, createQueryString])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/auth/simple-signin')
      return
    }
    fetchRequests()
  }, [user, isLoading, router, fetchRequests])

  // Update URL when filters change
  useEffect(() => {
    const query = createQueryString({
      search: searchQuery,
      status: statusFilter,
      type: typeFilter,
      sortBy: sortBy,
      sortOrder: sortOrder
    })
    // Use replace to avoid adding to browser history for every filter change
    router.replace(`${pathname}?${query}`, { scroll: false })
  }, [searchQuery, statusFilter, typeFilter, sortBy, sortOrder, pathname, router, createQueryString])

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc') // Default to desc when changing sort field
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
    setSortBy('createdAt')
    setSortOrder('desc')
  }

  const getStatusBadgeVariant = (status: RequestStatus) => {
    switch (status) {
      case 'COMPLETED': return 'default'
      case 'IN_PROGRESS': return 'secondary'
      case 'CANCELLED': return 'destructive'
      default: return 'outline'
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

  const displayRequests = requests;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">SEO Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Track your monthly SEO package progress</p>
        </div>
        <div className="flex items-center gap-3">
          <DealershipSelector />
          <Link href="/focus-request">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Focus Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search requests, cities, or models..."
          className="flex-1"
        />
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="page">Pages</SelectItem>
              <SelectItem value="blog">Blogs</SelectItem>
              <SelectItem value="gbp_post">GBP Posts</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value: string) => {
            const [newSortBy, newSortOrder] = value.split('-')
            setSortBy(newSortBy)
            setSortOrder(newSortOrder)
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Date (Newest)</SelectItem>
              <SelectItem value="createdAt-asc">Date (Oldest)</SelectItem>
              <SelectItem value="priority-desc">Priority (High-Low)</SelectItem>
              <SelectItem value="priority-asc">Priority (Low-High)</SelectItem>
              <SelectItem value="status-asc">Status (A-Z)</SelectItem>
              <SelectItem value="status-desc">Status (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
            <ListRestart className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {loading && (
         <div className="flex items-center justify-center py-12">
           <LoadingSpinner size="lg" />
         </div>
      )}
      {!loading && displayRequests.length === 0 ? (
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
              }/>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-gray-600">
            Showing {displayRequests.length} {displayRequests.length === 1 ? "request" : "requests"}
          </div>
          {displayRequests.map((request: Request) => {
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
                      <p className="text-2xl font-semibold">
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
                            <Wrench className="h-3 w-3" /> SEO Changes
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
                        {request.completedTasks.slice(0, 5).map((task: any, index: number) => (
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
