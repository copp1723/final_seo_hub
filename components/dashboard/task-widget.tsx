'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  MessageSquare, 
  Globe, 
  Wrench,
  ArrowRight,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type TaskType = 'PAGE' | 'BLOG' | 'GBP_POST' | 'IMPROVEMENT'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

interface Task {
  id: string
  title: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  requestTitle?: string
  dueDate?: string | null
  createdAt: string
}

interface TaskWidgetProps {
  tasks: Task[]
  title?: string
  showViewAll?: boolean
  maxTasks?: number
  className?: string
}

const typeIcons = {
  PAGE: FileText,
  BLOG: MessageSquare,
  GBP_POST: Globe,
  IMPROVEMENT: Wrench
}

const typeColors = {
  PAGE: 'text-blue-600',
  BLOG: 'text-green-600',
  GBP_POST: 'text-purple-600',
  IMPROVEMENT: 'text-orange-600'
}

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle,
  CANCELLED: AlertCircle
}

const statusColors = {
  PENDING: 'text-yellow-600',
  IN_PROGRESS: 'text-blue-600',
  COMPLETED: 'text-green-600',
  CANCELLED: 'text-red-600'
}

export function TaskWidget({ 
  tasks, 
  title = "Recent Tasks", 
  showViewAll = true,
  maxTasks = 5,
  className 
}: TaskWidgetProps) {
  const displayTasks = tasks.slice(0, maxTasks)
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length

  const isOverdue = (dueDate: string | null | undefined) => {
    return dueDate && new Date(dueDate) < new Date()
  }

  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No tasks to display</p>
            <p className="text-xs mt-1">Tasks will appear here once created</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {pendingTasks > 0 && (
              <Badge variant="warning" className="text-yellow-600 border-yellow-200">
                {pendingTasks} Pending
              </Badge>
            )}
            {inProgressTasks > 0 && (
              <Badge variant="info" className="text-blue-600 border-blue-200">
                {inProgressTasks} In Progress
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayTasks.map((task) => {
            const TypeIcon = typeIcons[task.type]
            const StatusIcon = statusIcons[task.status]
            const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED'

            return (
              <div 
                key={task.id} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors",
                  task.status === 'COMPLETED' && "opacity-60"
                )}
              >
                {/* Type Icon */}
                <div className={cn("mt-0.5", typeColors[task.type])}>
                  <TypeIcon className="h-5 w-5" />
                </div>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                      {task.requestTitle && (
                        <p className="text-xs text-gray-500 mt-0.5">{task.requestTitle}</p>
                      )}
                    </div>
                    <div className={cn("flex-shrink-0", statusColors[task.status])}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                  </div>
                  
                  {/* Task Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className={cn(
                      "flex items-center gap-1",
                      task.priority === 'HIGH' && "text-red-600 font-medium",
                      task.priority === 'MEDIUM' && "text-orange-600"
                    )}>
                      {task.priority === 'HIGH' && <AlertCircle className="h-3 w-3" />}
                      {task.priority} Priority
                    </span>
                    {task.dueDate && (
                      <span className={cn(
                        "flex items-center gap-1",
                        overdue && "text-red-600 font-medium"
                      )}>
                        <Calendar className="h-3 w-3" />
                        {overdue ? 'Overdue' : `Due ${format(new Date(task.dueDate), 'MMM d')}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Button */}
        {showViewAll && tasks.length > maxTasks && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/tasks">
              <Button variant="ghost" className="w-full" size="sm">
                View all {tasks.length} tasks
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}