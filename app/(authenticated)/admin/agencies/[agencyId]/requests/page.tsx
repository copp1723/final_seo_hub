'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import type { requests } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowUpDown, Eye } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils' // Assuming you have a utils file
import { LoadingSpinner } from '@/components/ui/loading' // Assuming a loading spinner component

interface AgencyRequest extends requests {
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

interface PaginatedResponse {
  requests: AgencyRequest[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const DEALERSHIP_TERMINOLOGY = "Dealership"; // Or fetch from constants/terminology

export default function AgencyRequestsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const agencyId = params.agencies.id as string

  const [requests, setRequests] = useState<AgencyRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '10'))
  const [totalPages, setTotalPages] = useState(1)
  const [totalRequests, setTotalRequests] = useState(0)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  )

  const updateURLParams = useCallback(() => {
    const newParams = new URLSearchParams()
    if (page > 1) newParams.set('page', page.toString())
    if (limit !== 10) newParams.set('limit', limit.toString())
    if (searchTerm) newParams.set('search', searchTerm)
    if (statusFilter !== 'all') newParams.set('status', statusFilter)
    if (typeFilter !== 'all') newParams.set('type', typeFilter)
    if (sortBy !== 'createdAt') newParams.set('sortBy', sortBy)
    if (sortOrder !== 'desc') newParams.set('sortOrder', sortOrder)
    router.replace(`/admin/agencies/${agencyId}/requests?${newParams.toString()}`, { scroll: false })
  }, [page, limit, searchTerm, statusFilter, typeFilter, sortBy, sortOrder, agencyId, router])


  const fetchRequests = useCallback(async () => {
    if (status === 'loading' || !session || !agencyId) return
    if (session.user.role !== UserRole.SUPER_ADMIN && (session.user.role !== UserRole.AGENCY_ADMIN || session.user.agency.id !== agencyId)) {
      setError(`Access Denied.You don&apos;t have permission to view these ${DEALERSHIP_TERMINOLOGY} requests.`)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: searchTerm,
      status: statusFilter,
      type: typeFilter,
      sortBy: sortBy,
      sortOrder: sortOrder
    }).toString()

    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/requests?${queryParams}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch ${DEALERSHIP_TERMINOLOGY} requests`)
      }
      const responseData = await response.json()
      
      // Handle the wrapped response structure from successResponse
      if (responseData.success && responseData.data) {
        const data = responseData.data
        setRequests(data.requests)
        setTotalRequests(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
      } else {
        throw new Error(responseData.error || 'Invalid response format')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An unknown error occurred while fetching ${DEALERSHIP_TERMINOLOGY} requests.`
      setError(errorMessage)
      toast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [status, session, agencyId, page, limit, searchTerm, statusFilter, typeFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    updateURLParams()
  }, [updateURLParams])


  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
     setPage(1); // Reset to first page on sort
  }

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead onClick={() => handleSort(column)} className="cursor-pointer">
      <div className="flex items-center">
        {label}
        {sortBy === column && <ArrowUpDown className="ml-2 h-4 w-4" />}
      </div>
    </TableHead>
  )

  if (status === 'loading') return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>
  if (!session || (session.user.role !== UserRole.SUPER_ADMIN && (session.user.role !== UserRole.AGENCY_ADMIN || session.user.agency.id !== agencyId))) {
     return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p>You do not have permission to view this page.Please contact your administrator</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">All {DEALERSHIP_TERMINOLOGY} Requests for Agency</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder={`Search by title, user, email...`}
          value={searchTerm}
          onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}}
          className="lg:col-span-2"
        />
        <Select value={statusFilter} onValueChange={(value: string) => {setStatusFilter(value); setPage(1);}}>
          <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(value: string) => {setTypeFilter(value); setPage(1);}}>
          <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {/* These should ideally come from a constant or API */}
            <SelectItem value="page">Page</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="gbp_post">GBP Post</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="flex justify-center items-center py-10"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      {!isLoading && !error && requests.length === 0 && (
        <p className="text-center text-gray-500 py-10">No {DEALERSHIP_TERMINOLOGY} requests found matching your criteria</p>
      )}
      {!isLoading && !error && requests.length > 0 && (
        <>
          <div className="overflow-x-auto bg-white shadow-md rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="title" label="Title" />
                  <SortableHeader column="user" label={`${DEALERSHIP_TERMINOLOGY} User`} />
                  <SortableHeader column="type" label="Type" />
                  <SortableHeader column="status" label="Status" />
                  <SortableHeader column="priority" label="Priority" />
                  <SortableHeader column="createdAt" label="Created At" />
                  <SortableHeader column="updatedAt" label="Last Updated" />
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell>{req.user.name || req.user.email || 'N/A'}</TableCell>
                    <TableCell>{req.type}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 text-xs font-semibold rounded-full",
                        req.status === 'PENDING' && "bg-yellow-100 text-yellow-800",
                        req.status === 'IN_PROGRESS' && "bg-blue-100 text-blue-800",
                        req.status === 'COMPLETED' && "bg-green-100 text-green-800",
                        req.status === 'CANCELLED' && "bg-red-100 text-red-800"
                      )}>
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell>{req.priority}</TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>{formatDate(req.updatedAt)}</TableCell>
                    <TableCell>
                      <Link href={`/requests/${req.id}`} passHref>
                        <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-gray-700">
              Showing {requests.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalRequests)} of {totalRequests} {DEALERSHIP_TERMINOLOGY.toLowerCase()} requests
            </span>
            <div className="flex items-center space-x-2">
              <Select value={limit.toString()} onValueChange={(val: string) => {setLimit(parseInt(val)); setPage(1);}}>
                 <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                 </SelectContent>
              </Select>
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
