'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  MessageSquare, 
  Globe, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  PlayCircle,
  MoreVertical,
  Calendar,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type TaskType = 'PAGE' | 'BLOG' | 'GBP_POST' | 'IMPROVEMENT'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string | null
    type: TaskType
    status: TaskStatus
    priority: TaskPriority
    requestTitle?: string
    requestId?: string
    targetUrl?: string | null
    targetCity?: string | null
    targetModel?: string | null
    completedUrl?: string | null
    dueDate?: string | null
    startedAt?: string | null
    completedAt?: string | null
    createdAt: string
  }
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onViewDetails?: (taskId: string) => void
  className?: string
}

const typeConfig = {
  PAGE: {
    icon: FileText,
    label: 'Page',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  BLOG: {
    icon: MessageSquare,
    label: 'Blog',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  GBP_POST: {
    icon: Globe,
    label: 'GBP Post',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600'
  },
  IMPROVEMENT: {
    icon: Wrench,
    label: 'SEO Change',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  }
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  IN_PROGRESS: {
    icon: AlertCircle,
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  COMPLETED: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  CANCELLED: {
    icon: AlertCircle,
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200'
  }
}

const priorityConfig = {
  LOW: {
    label: 'Low',
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  MEDIUM: {
    label: 'Medium',
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  HIGH: {
    label: 'High',
    color: 'bg-red-100 text-red-700 border-red-200'
  }
}

export function TaskCard({ task, onStatusChange, onViewDetails, className }: TaskCardProps) {
  const typeInfo = typeConfig[task.type]
  const statusInfo = statusConfig[task.status]
  const priorityInfo = priorityConfig[task.priority]
  const TypeIcon = typeInfo.icon
  const StatusIcon = statusInfo.icon

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'

  const handleStatusAction = (newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus)
    }
  }

  return (
    <Card className={cn(
      "hover-lift card-modern border-0 shadow-soft hover:shadow-elegant",
      task.status === 'COMPLETED' && "opacity-90",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          {/* Type Icon and Title */}
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              "p-3 rounded-xl shadow-soft",
              typeInfo.bgColor
            )}>
              <TypeIcon className={cn("h-6 w-6", typeInfo.textColor)} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-2">{task.title}</h3>
              {task.requestTitle && (
                <p className="text-sm text-gray-500 mt-1">
                  Request: {task.requestTitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status === 'PENDING' && (
                <DropdownMenuItem onClick={() => handleStatusAction('IN_PROGRESS')}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start Task
                </DropdownMenuItem>
              )}
              {task.status === 'IN_PROGRESS' && (
                <DropdownMenuItem onClick={() => handleStatusAction('COMPLETED')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(task.id)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status and Priority Badges */}
        <div className="flex items-center gap-2 mt-3">
          <Badge 
            variant="default" 
            className={cn("flex items-center gap-1", statusInfo.color)}
          >
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
          <Badge 
            variant="default" 
            className={cn(priorityInfo.color)}
          >
            {priorityInfo.label} Priority
          </Badge>
          {isOverdue && (
            <Badge variant="error" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Target Information */}
        <div className="space-y-2 mb-4">
          {(task.targetCity || task.targetModel) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {task.targetCity && (
                <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-700">
                  📍 {task.targetCity}
                </span>
              )}
              {task.targetModel && (
                <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-700">
                  🚗 {task.targetModel}
                </span>
              )}
            </div>
          )}
          {task.targetUrl && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Target URL:</span>{' '}
              <a 
                href={task.targetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {task.targetUrl}
              </a>
            </div>
          )}
        </div>

        {/* Timeline Information */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
          <div className="flex items-center gap-4">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  Due {format(new Date(task.dueDate), 'MMM d')}
                </span>
              </div>
            )}
            {task.completedAt && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Completed {format(new Date(task.completedAt), 'MMM d')}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {task.status !== 'COMPLETED' && (
            <div className="flex items-center gap-2">
              {task.status === 'PENDING' && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleStatusAction('IN_PROGRESS')}
                  className="h-7 text-xs"
                >
                  <PlayCircle className="h-3 w-3 mr-1" />
                  Start
                </Button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <Button 
                  size="sm" 
                  variant="primary"
                  onClick={() => handleStatusAction('COMPLETED')}
                  className="h-7 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          )}

          {/* Prominent View Work Button for Completed Tasks */}
          {task.status === 'COMPLETED' && task.targetUrl && (
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 font-medium px-4 py-2"
              onClick={() => window.open(task.targetUrl!, '_blank', 'noopener,noreferrer')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Work
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}