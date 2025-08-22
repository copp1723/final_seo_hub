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
import { 
  FileText, 
  Globe, 
  MessageSquare, 
  Wrench, 
  Plus, 
  ExternalLink, 
  Filter, 
  ListRestart, 
  ArrowUpDown,
  Eye,
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  AlertCircle
} from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DealershipSelector } from '@/components/layout/dealership-selector'
import { MultiDealershipSelector } from '@/components/layout/multi-dealership-selector'
import { AgencySelector } from '@/components/layout/agency-selector'

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

// Task Management Card Component
const TaskManagementCard = ({ task, onStatusChange }: { task: any, onStatusChange: (taskId: string, status: string) => void }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAGE': return <FileText className="h-4 w-4" />
      case 'BLOG': return <MessageSquare className="h-4 w-4" />
      case 'GBP_POST': return <Globe className="h-4 w-4" />
      case 'IMPROVEMENT': return <Wrench className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-gray-100 rounded-lg">
            {getTypeIcon(task.type)}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs border ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </Badge>
              {task.priority && (
                <span className="text-xs text-gray-500">{task.priority} Priority</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          {task.status === 'PENDING' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
              className="text-xs"
            >
              <PlayCircle className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
          {task.status === 'IN_PROGRESS' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onStatusChange(task.id, 'COMPLETED')}
              className="text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
          {/* DIRECT View Work Button for Completed Tasks */}
          {task.status === 'COMPLETED' && task.targetUrl && (
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-xs"
              onClick={() => window.open(task.targetUrl, '_blank', 'noopener,noreferrer')}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Work
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Enhanced Card Component for Better Visual Hierarchy
const EnhancedRequestCard = ({ request }: { request: Request }) => {
  const progress = request.packageType 
    ? calculatePackageProgress(
        request.packageType,
        request.pagesCompleted,
        request.blogsCompleted,
        request.gbpPostsCompleted,
        request.improvementsCompleted
      )
    : null

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'page': return <FileText className="h-4 w-4" />
      case 'blog': return <MessageSquare className="h-4 w-4" />
      case 'gbp_post': return <Globe className="h-4 w-4" />
      case 'improvement': return <Wrench className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="card-modern hover-lift border-l-4 border-l-brand-medium shadow-brand">
      {/* Enhanced Header with Better Spacing */}
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <CardTitle className="text-xl font-semibold text-gray-900 leading-tight">
                {request.title}
              </CardTitle>
              {request.status === 'COMPLETED' && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {request.packageType && (
                <Badge variant="secondary" className="font-medium">
                  {request.packageType}
                </Badge>
              )}
              <Badge className={`font-medium border ${getStatusColor(request.status)}`}>
                {request.status.toLowerCase().replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(request.createdAt)}</span>
              </div>
              {request.completedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Completed {formatDate(request.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Progress Display */}
          <div className="text-right ml-6">
            <div className="bg-gray-50 rounded-lg p-3 min-w-[120px]">
              <p className="text-2xl font-bold text-gray-900">
                {progress?.totalTasks.completed || 0} / {progress?.totalTasks.total || 0}
              </p>
              <p className="text-sm text-gray-600">tasks completed</p>
              {progress && progress.totalTasks.total > 0 && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(progress.totalTasks.completed / progress.totalTasks.total) * 100}%` 
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Current Targets with Better Layout */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-lg">Current Targets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-700 font-medium">Cities: </span>
              <span className="text-gray-900">
                {request.targetCities?.join(', ') || 'Not specified'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-700 font-medium">Models: </span>
              <span className="text-gray-900">
                {request.targetModels?.join(', ') || 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Progress Bars */}
        {progress && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-lg">Progress Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-brand-dark" /> Pages
                    </span>
                    <span className="font-semibold">{progress.pages.completed} of {progress.pages.total}</span>
                  </div>
                  <div className="progress-modern h-3">
                    <div 
                      className="progress-fill bg-gradient-brand-reverse shadow-brand"
                      style={{ width: `${(progress.pages.completed / progress.pages.total) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2 font-medium">
                      <MessageSquare className="h-4 w-4 text-brand-dark" /> Blogs
                    </span>
                    <span className="font-semibold">{progress.blogs.completed} of {progress.blogs.total}</span>
                  </div>
                  <div className="progress-modern h-3">
                    <div 
                      className="progress-fill bg-gradient-brand-reverse shadow-brand"
                      style={{ width: `${(progress.blogs.completed / progress.blogs.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Globe className="h-4 w-4 text-brand-dark" /> GBP Posts
                    </span>
                    <span className="font-semibold">{progress.gbpPosts.completed} of {progress.gbpPosts.total}</span>
                  </div>
                  <div className="progress-modern h-3">
                    <div 
                      className="progress-fill bg-gradient-brand-reverse shadow-brand"
                      style={{ width: `${(progress.gbpPosts.completed / progress.gbpPosts.total) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Wrench className="h-4 w-4 text-brand-dark" /> SEO Changes
                    </span>
                    <span className="font-semibold">{progress.improvements.completed} of {progress.improvements.total}</span>
                  </div>
                  <div className="progress-modern h-3">
                    <div 
                      className="progress-fill bg-gradient-brand-reverse shadow-brand"
                      style={{ width: `${(progress.improvements.completed / progress.improvements.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ENHANCED Completed Tasks Section - RESTORED */}
        {request.completedTasks && request.completedTasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Completed Tasks
                <Badge variant="secondary" className="ml-2">
                  {request.completedTasks.length}
                </Badge>
              </h3>
            </div>
            
            {/* Enhanced Task Cards */}
            <div className="space-y-3">
              {request.completedTasks.slice(0, 5).map((task: any, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 card-modern hover-lift"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTypeIcon(task.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1 leading-tight">{task.title}</h4>
                      <p className="text-xs text-gray-600">
                        {task.type.charAt(0).toUpperCase() + task.type.slice(1)} • Completed
                      </p>
                    </div>
                  </div>
                  
                  {/* DIRECT View Work Button - Opens work immediately */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-medium px-4 py-2"
                    onClick={() => {
                      // Direct link to completed work - no navigation needed!
                      if (task.url) {
                        window.open(task.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Work
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
              
              {request.completedTasks.length > 5 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-3 h-12 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                  onClick={() => window.location.href = `/tasks?requestId=${request.id}&filter=completed`}
                >
                  View all {request.completedTasks.length} completed tasks
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Task Management Section - Simplified for now */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">Task Management</span>
            {progress && (
              <span className="text-sm text-gray-600">
                {progress.totalTasks.completed}/{progress.totalTasks.total} completed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Click on individual completed tasks above to view the work directly.
          </p>
        </div>

        {/* Active Tasks Summary */}
        {progress && (
          <div className="mt-6 pt-4 border-t bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Active tasks remaining:
              </span>
              <span className="text-lg font-bold text-gray-900">
                {progress.totalTasks.total - progress.totalTasks.completed}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function RequestsPageEnhanced() {
  const { user, isLoading } = useAuth()
  const { currentDealership } = useDealership()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())
  const [requestTasks, setRequestTasks] = useState<Record<string, any[]>>({})
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')
  const [selectedDealershipIds, setSelectedDealershipIds] = useState<string[]>([])

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
    // Defensive guard: don't fetch if user is still loading or not authenticated
    if (isLoading || !user?.id) {
      return
    }
    
    setLoading(true)
    try {
      // For AGENCY_ADMIN users with multi-selection, use selectedDealershipIds
      // For other users, use currentDealership
      const dealershipFilter = user?.role === 'AGENCY_ADMIN' && selectedDealershipIds.length > 0
        ? { dealershipIds: selectedDealershipIds.join(',') }
        : currentDealership?.id 
          ? { dealershipId: currentDealership.id }
          : {}
      
      const query = createQueryString({
        search: searchQuery,
        status: statusFilter,
        type: typeFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
        ...dealershipFilter
      })
      const response = await fetch(`/api/requests?${query}`)
      const data = await response.json()
      
      // Handle both wrapped and unwrapped response formats for backward compatibility
      if (response.ok) {
        // Check for new format (direct data) first, then legacy format (wrapped)
        const requests = data.requests || data.data?.requests || []
        setRequests(requests)
      } else {
        const errorMsg = data.error || data.message || `HTTP ${response.status}`
        console.error('Failed to fetch requests:', errorMsg)
        setRequests([])
      }
    } catch (error) {
      // Defensive error handling - ensure we always have a meaningful error message
      const errorMsg = error instanceof Error ? error.message : 
                      error ? String(error) : 
                      'Unknown error occurred'
      console.error('Failed to fetch requests:', errorMsg)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, typeFilter, sortBy, sortOrder, currentDealership?.id, selectedDealershipIds, createQueryString, isLoading, user?.id, user?.role])

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

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
    setSortBy('createdAt')
    setSortOrder('desc')
  }

  // Handle expanding/collapsing request sections
  const toggleRequestExpansion = async (requestId: string) => {
    const newExpanded = new Set(expandedRequests)
    
    if (expandedRequests.has(requestId)) {
      newExpanded.delete(requestId)
    } else {
      newExpanded.add(requestId)
      
      // Fetch tasks for this request if we don't have them yet
      if (!requestTasks[requestId]) {
        try {
          const response = await fetch(`/api/tasks?requestId=${requestId}${currentDealership?.id ? `&dealershipId=${currentDealership.id}` : ''}`)
          if (response.ok) {
            const data = await response.json()
            setRequestTasks(prev => ({
              ...prev,
              [requestId]: data.tasks || []
            }))
          }
        } catch (error) {
          console.error('Error fetching tasks:', error)
        }
      }
    }
    
    setExpandedRequests(newExpanded)
  }

  // Handle task status changes
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        // Refresh the tasks for the affected request
        // You could implement more granular updates here
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Requests</h1>
            <p className="text-gray-600 mt-2">Manage and track all your SEO requests</p>
          </div>
          <div className="flex gap-3">
            <AgencySelector />
            {/* Conditional dealership selector based on user role */}
            {user?.role === 'AGENCY_ADMIN' ? (
              <MultiDealershipSelector 
                selectedDealershipIds={selectedDealershipIds}
                onSelectionChange={setSelectedDealershipIds}
              />
            ) : (
              <DealershipSelector />
            )}
            <Link href="/focus-request">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                <Plus className="h-4 w-4 mr-2" />
                Focus Request
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search requests, cities, or models..."
            className="flex-1"
          />
          
          <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && requests.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No active SEO packages"
              description="Start by submitting your target cities, models, and dealers during onboarding"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            Showing {requests.length} {requests.length === 1 ? "request" : "requests"}
          </div>
          
          {/* Enhanced Request Cards */}
          {requests.map((request: Request) => (
            <EnhancedRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  )
}