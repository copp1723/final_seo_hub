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
  GBP_POST: 'text-purple-400',
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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tasks</CardTitle>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{pendingTasks + inProgressTasks} Active</span>
            <span>•</span>
            <span>{tasks.filter(t => t.status === 'COMPLETED').length} Complete</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No active tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => {
              const overdue = isOverdue(task.dueDate) && task.status !== 'COMPLETED'

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center justify-between py-2 border-b border-gray-100 last:border-0",
                    task.status === 'COMPLETED' && "opacity-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        task.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                        task.status === 'IN_PROGRESS' && "bg-blue-100 text-blue-700",
                        task.status === 'COMPLETED' && "bg-green-100 text-green-700"
                      )}>
                        {task.status.replace('_', ' ').toLowerCase()}
                      </span>
                      {task.dueDate && (
                        <span className={cn(
                          "text-xs text-gray-500",
                          overdue && "text-red-600"
                        )}>
                          Due {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* View All Link */}
        {showViewAll && tasks.length > maxTasks && (
          <div className="mt-4 pt-3 border-t">
            <Link href="/tasks" className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1">
              View all {tasks.length} tasks
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}