'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Mail, Search, Filter, Users, Settings, Send, Eye } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  agencyId: string | null
  preferences: {
    emailNotifications: boolean
    taskCompleted: boolean
    requestCreated: boolean
    statusChanged: boolean
    weeklySummary: boolean
  } | null
}

interface Agency {
  id: string
  name: string
  domain: string
  userCount: number
}

export function ContentNotificationAdminPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAgency, setSelectedAgency] = useState<string>('all')
  const [filterEnabled, setFilterEnabled] = useState<string>('all')
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch users with preferences
      const usersRes = await fetch('/api/admin/users/notification-preferences')
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      // Fetch agencies
      const agenciesRes = await fetch('/api/admin/agencies')
      if (agenciesRes.ok) {
        const agenciesData = await agenciesRes.json()
        setAgencies(agenciesData.agencies || [])
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const updateUserPreference = async (userId: string, preference: string, enabled: boolean) => {
    setSaving(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [preference]: enabled })
      })

      if (res.ok) {
        // Update local state
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user,
                preferences: { ...user.preferences!,
                  [preference]: enabled
                }
              }
            : user
        ))
        setMessage({ type: 'success', text: `Updated ${preference} for user` })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to update preference' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preference' })
    } finally {
      setSaving(null)
    }
  }

  const testContentNotification = async (userId: string, taskType: string) => {
    try {
      const res = await fetch('/api/test/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskType, 
          userId,
          title: `Test ${taskType} notification for user`
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: `Test notification sent to user` })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test notification' })
    }
  }

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAgency = selectedAgency === 'all' || user.agencyId === selectedAgency
    
    const matchesFilter = filterEnabled === 'all' || 
      (filterEnabled === 'enabled' && user.preferences?.emailNotifications && user.preferences?.taskCompleted) ||
      (filterEnabled === 'disabled' && (!user.preferences?.emailNotifications || !user.preferences?.taskCompleted))
    
    return matchesSearch && matchesAgency && matchesFilter
  })

  const stats = {
    total: users.length,
    enabled: users.filter(u => u.preferences?.emailNotifications && u.preferences?.taskCompleted).length,
    disabled: users.filter(u => !u.preferences?.emailNotifications || !u.preferences?.taskCompleted).length
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Notification Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage content notification preferences for all users
        </p>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notifications Enabled</p>
                <p className="text-2xl font-bold text-green-600">{stats.enabled}</p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notifications Disabled</p>
                <p className="text-2xl font-bold text-red-600">{stats.disabled}</p>
              </div>
              <Settings className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agency-filter">Filter by Agency</Label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name} ({agency.userCount} users)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={filterEnabled} onValueChange={setFilterEnabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="enabled">Notifications Enabled</SelectItem>
                  <SelectItem value="disabled">Notifications Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Notification Preferences</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Email Notifications</TableHead>
                  <TableHead>Content Notifications</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const agency = agencies.find(a => a.id === user.agencyId)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {agency ? (
                          <div>
                            <p className="font-medium">{agency.name}</p>
                            <p className="text-xs text-muted-foreground">{agency.domain}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No agency</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.preferences?.emailNotifications || false}
                          onCheckedChange={(checked) => 
                            updateUserPreference(user.id, 'emailNotifications', checked)
                          }
                          disabled={saving === user.id}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={(user.preferences?.taskCompleted && user.preferences?.emailNotifications) || false}
                          onCheckedChange={(checked) => 
                            updateUserPreference(user.id, 'taskCompleted', checked)
                          }
                          disabled={saving === user.id || !user.preferences?.emailNotifications}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testContentNotification(user.id, 'page')}
                            disabled={!user.preferences?.emailNotifications || !user.preferences?.taskCompleted}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open('/api/email/preview/content?type=page', '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          </CardContent>
      </Card>
    </div>
  )
}
