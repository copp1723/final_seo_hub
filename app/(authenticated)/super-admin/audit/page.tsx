'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading'

interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string | null
  details: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    name: string | null
    email: string
    role: string
  }
}

interface AuditStats {
  totalLogs: number
  todayLogs: number
  weekLogs: number
  topActions: Array<{ action: string; count: number }>
  topUsers: Array<{ userId: string; userName: string; count: number }>
}

export default function SuperAdminAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    fetchAuditLogs()
    fetchAuditStats()
  }, [currentPage, searchTerm, actionFilter, userFilter, dateFilter, resourceFilter])

  const fetchAuditLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter && actionFilter !== 'all' && { action: actionFilter }),
        ...(userFilter && { userId: userFilter }),
        ...(dateFilter && { date: dateFilter }),
        ...(resourceFilter && resourceFilter !== 'all' && { resource: resourceFilter })
      })

      const response = await fetch(`/api/super-admin/audit?${params}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch audit logs')
      }
      
      const data = await response.json()
      setAuditLogs(data.logs)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching audit logs.'
      setError(errorMessage)
      toast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAuditStats = async () => {
    try {
      const response = await fetch('/api/super-admin/audit/stats')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch audit statistics')
      }
      
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching audit stats:', err)
      // Don't show error toast for stats failures
    }
  }

  const handleExportLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter && actionFilter !== 'all' && { action: actionFilter }),
        ...(userFilter && { userId: userFilter }),
        ...(dateFilter && { date: dateFilter }),
       ...(resourceFilter && resourceFilter !== 'all' && { resource: resourceFilter }),
        format: 'csv'
      })

      const response = await fetch(`/api/super-admin/audit/export?${params}`)
      if (!response.ok) {
        throw new Error('Failed to export audit logs')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast('Audit logs exported successfully.', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export audit logs.'
      toast(errorMessage, 'error')
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return <User className="h-4 w-4" />
    } else if (action.includes('CREATE')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (action.includes('DELETE')) {
      return <XCircle className="h-4 w-4 text-red-500" />
    } else if (action.includes('UPDATE') || action.includes('EDIT')) {
      return <Activity className="h-4 w-4 text-blue-500" />
    } else if (action.includes('ERROR') || action.includes('FAIL')) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return 'bg-blue-100 text-blue-800'
    } else if (action.includes('CREATE')) {
      return 'bg-green-100 text-green-800'
    } else if (action.includes('DELETE')) {
      return 'bg-red-100 text-red-800'
    } else if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-purple-100 text-purple-800'
    } else if (action.includes('ERROR') || action.includes('FAIL')) {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const clearFilters = () => {
    setSearchTerm('')
    setActionFilter('all')
    setUserFilter('')
    setDateFilter('')
    setResourceFilter('all')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-3 h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-gray-600 mt-2">Monitor system activity and user actions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchAuditLogs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Logs</p>
                  <p className="text-3xl font-bold">{stats.totalLogs.toLocaleString()}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-3xl font-bold">{stats.todayLogs}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-3xl font-bold">{stats.weekLogs}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Action</p>
                  <p className="text-lg font-bold truncate">
                    {stats.topActions[0]?.action || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.topActions[0]?.count || 0} times
                  </p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="USER_LOGIN">User Login</SelectItem>
                  <SelectItem value="USER_LOGOUT">User Logout</SelectItem>
                  <SelectItem value="USER_CREATE">User Create</SelectItem>
                  <SelectItem value="USER_UPDATE">User Update</SelectItem>
                  <SelectItem value="USER_DELETE">User Delete</SelectItem>
                  <SelectItem value="AGENCY_CREATE">Agency Create</SelectItem>
                  <SelectItem value="AGENCY_UPDATE">Agency Update</SelectItem>
                  <SelectItem value="AGENCY_DELETE">Agency Delete</SelectItem>
                  <SelectItem value="SYSTEM_SETTINGS_UPDATE">System Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="User">Users</SelectItem>
                  <SelectItem value="Agency">Agencies</SelectItem>
                  <SelectItem value="Request">Requests</SelectItem>
                  <SelectItem value="SystemSettings">System Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading and Error States */}
      {isLoading && <div className="flex justify-center items-center py-10"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      {/* Audit Logs Table */}
      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Showing {auditLogs.length} of {totalCount} logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Audit Logs Found</h3>
                <p className="text-gray-600">No logs match your current filters</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.user.name || log.user.email}</div>
                            <Badge variant="secondary" className="text-xs">
                              {log.user.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getActionIcon(log.action)}
                            <Badge className={`ml-2 ${getActionColor(log.action)}`}>
                              {log.action}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.resource}</div>
                            {log.resourceId && (
                              <div className="text-xs text-gray-500 truncate max-w-[100px]">
                                {log.resourceId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm">
                            {typeof log.details === 'object' 
                              ? JSON.stringify(log.details).substring(0, 100) + '...'
                              : log.details
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {log.ipAddress || 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
