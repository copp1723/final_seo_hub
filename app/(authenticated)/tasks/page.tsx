'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useDealership } from '@/app/context/DealershipContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ListChecks,
  Filter,
  Plus,
  FileText,
  MessageSquare,
  Globe,
  Wrench,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { TaskList } from '@/components/tasks/task-list'
import { LoadingSpinner } from '@/components/ui/loading'
import { DealershipSelector } from '@/components/layout/dealership-selector'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
// Extend or refine as needed – kept broad for demonstration purposes
type TaskType = 'PAGE' | 'BLOG' | 'GBP_POST' | 'IMPROVEMENT'

export interface Task {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  // Optional/auxiliary fields
  requestTitle?: string
  requestId?: string
  targetUrl?: string
  targetCity?: string
  targetModel?: string
  dueDate?: string
  startedAt?: string
  createdAt: string
  completedUrl?: string
  completedAt?: string
}

// Tasks will be fetched from the API

export default function TasksPage() {
  const { user, isLoading } = useAuth()
  const { currentDealership } = useDealership()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  // Fetch tasks from API
  useEffect(() => {
    if (!user) return

    const fetchTasks = async () => {
      try {
        setTasksLoading(true)
        const endpoint = `/api/tasks${currentDealership?.id ? `?dealershipId=${currentDealership.id}` : ''}`
        const response = await fetch(endpoint)
        if (response.ok) {
          const data = await response.json()
          setTasks(data.tasks || [])
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
      } finally {
        setTasksLoading(false)
      }
    }

    fetchTasks()
  }, [user, currentDealership?.id])

  if (isLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    router.push('/auth/simple-signin')
    return null
  }

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < new Date() && 
      t.status !== 'COMPLETED'
    ).length,
    highPriority: tasks.filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED').length
  }

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'active':
        return tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
      case 'completed':
        return tasks.filter(t => t.status === 'COMPLETED')
      case 'overdue':
        return tasks.filter(t => 
          t.dueDate && 
          new Date(t.dueDate) < new Date() && 
          t.status !== 'COMPLETED'
        )
      default:
        return tasks
    }
  }

  // Update task status via API
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error('Failed to update task status');
      }
      // Optionally, refresh tasks or show a notification here
      // For now, just reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error updating task status:', error);
      // Optionally, show a toast notification
    }
  };

  // Navigate to task details page
  const handleViewDetails = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and track all your SEO tasks</p>
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

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{taskStats.total}</p>
              <ListChecks className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-yellow-600">{taskStats.pending}</p>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-orange-600">{taskStats.highPriority}</p>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Lists with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">
            All Tasks
            <Badge variant="secondary" className="ml-2 h-5 px-1">
              {taskStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-2 h-5 px-1">
              {taskStats.pending + taskStats.inProgress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge variant="secondary" className="ml-2 h-5 px-1">
              {taskStats.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {taskStats.overdue > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1">
                {taskStats.overdue}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <TaskList 
            tasks={getFilteredTasks()} 
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <TaskList 
            tasks={getFilteredTasks()} 
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <TaskList 
            tasks={getFilteredTasks()} 
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
            showFilters={false}
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          <TaskList 
            tasks={getFilteredTasks()} 
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
            showFilters={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}