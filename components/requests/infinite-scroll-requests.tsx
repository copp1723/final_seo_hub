'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RequestCard } from './request-card'
import { Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface Request {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  packageType: string | null
  createdAt: string
  completedAt: string | null
  pagesCompleted: number
  blogsCompleted: number
  gbpPostsCompleted: number
  improvementsCompleted: number
}

interface PaginationInfo {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface InfiniteScrollRequestsProps {
  initialRequests: Request[]
  initialPagination: PaginationInfo
  searchQuery?: string
  statusFilter?: string
}

export function InfiniteScrollRequests({
  initialRequests,
  initialPagination,
  searchQuery = '',
  statusFilter = ''
}: InfiniteScrollRequestsProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(searchQuery)
  const debouncedSearch = useDebounce(search, 500)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Load more requests
  const loadMore = useCallback(async () => {
    if (loading || !pagination.hasNextPage) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page + 1),
        pageSize: String(pagination.pageSize),
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch })
      })
      
      const response = await fetch(`/api/requests/paginated?${params}`)
      if (!response.ok) throw new Error('Failed to fetch requests')
      
      const data = await response.json()
      setRequests(prev => [...prev, ...data.data.requests])
      setPagination(data.data.pagination)
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false)
    }
  }, [pagination, loading, statusFilter, debouncedSearch])

  // Search requests
  const searchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: String(pagination.pageSize),
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch })
      })
      
      const response = await fetch(`/api/requests/paginated?${params}`)
      if (!response.ok) throw new Error('Failed to fetch requests')
      
      const data = await response.json()
      setRequests(data.data.requests)
      setPagination(data.data.pagination)
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false)
    }
  }, [pagination.pageSize, statusFilter, debouncedSearch])

  // Set up intersection observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [loadMore])

  // Handle search changes
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      searchRequests()
    }
  }, [debouncedSearch, searchRequests, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search requests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <p className="text-center text-gray-500 py-8">No requests found</p>
      )}

      {pagination.hasNextPage && (
        <div ref={loadMoreRef} className="h-20" />
      )}
    </div>
  )
}