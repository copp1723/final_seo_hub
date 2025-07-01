'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

// Mock data for demonstration
const mockTasks = [
  {
    id: '1',
    title: 'Create landing page for Austin Ford dealership',
    description: 'Design and implement a new landing page targeting Ford F-150 buyers in the Austin area',
    type: 'PAGE' as const,
    status: 'IN_PROGRESS' as const,
    priority: 'HIGH' as const,
    requestTitle: 'Q4 SEO Package - Austin',
    requestId: 'req-1',
    targetUrl: 'https://example.com/austin-ford',
    targetCity: 'Austin, TX',
    targetModel: 'Ford F-150',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    title: 'Write blog post about F-150 maintenance tips',
    description: 'Create comprehensive guide covering oil changes, tire rotation, and seasonal maintenance',
    type: 'BLOG' as const,
    status: 'PENDING' as const,
    priority: 'MEDIUM' as const,
    requestTitle: 'Monthly Blog Content',
    requestId: 'req-2',
    targetCity: 'Houston, TX',
    targetModel: 'Ford F-150',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'Post Google Business Profile update for Dallas location',
    description: 'Share recent customer testimonial and showcase new inventory',
    type: 'GBP_POST' as const,
    status: 'PENDING' as const,
    priority: 'LOW' as const,
    requestTitle: 'GBP Management - Dallas',
    requestId: 'req-3',
    targetCity: 'Dallas, TX',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    title: 'Optimize meta descriptions for Silverado pages',
    description: 'Update meta descriptions to include local keywords and improve CTR',
    type: 'IMPROVEMENT' as const,
    status: 'COMPLETED' as const,
    priority: 'MEDIUM' as const,
    requestTitle: 'Technical SEO Improvements',
    requestId: 'req-4',
    targetModel: 'Chevrolet Silverado',
    completedUrl: 'https://example.com/silverado-seo-report',
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    title: 'Create San Antonio dealership service page',
    description: 'Build dedicated page for service department with appointment scheduling',
    type: 'PAGE' as const,
    status: 'PENDING' as const,
    priority: 'HIGH' as const,
    requestTitle: 'Q4 SEO Package - San Antonio',
    requestId: 'req-5',
    targetCity: 'San Antonio, TX',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
]

export default function TasksPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [tasks] = useState(mockTasks)

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
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

  const handleStatusChange = (taskId: string, newStatus: any) => {
    console.log('Status change:', taskId, newStatus)
    // TODO: Implement API call to update task status
  }

  const handleViewDetails = (taskId: string) => {
    console.log('View details:', taskId)
    // TODO: Navigate to task details or open modal
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and track all your SEO tasks</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
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
            <Badge variant="info" className="ml-2 h-5 px-1">
              {taskStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="info" className="ml-2 h-5 px-1">
              {taskStats.pending + taskStats.inProgress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge variant="info" className="ml-2 h-5 px-1">
              {taskStats.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {taskStats.overdue > 0 && (
              <Badge variant="error" className="ml-2 h-5 px-1">
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