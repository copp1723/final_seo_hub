'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  MessageSquare, 
  Globe, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  MapPin,
  Car,
  Calendar,
  Target
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  type: 'PAGE' | 'BLOG' | 'GBP_POST' | 'IMPROVEMENT'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completedUrl?: string
  targetCity?: string
  targetModel?: string
}

interface EnhancedRequestCardProps {
  request: {
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
    targetCities?: string[]
    targetModels?: string[]
    tasks?: Task[]
  }
}

const typeIcons = {
  PAGE: FileText,
  BLOG: MessageSquare,
  GBP_POST: Globe,
  IMPROVEMENT: Wrench
}

const typeColors = {
  PAGE: 'bg-blue-100 text-blue-700',
  BLOG: 'bg-green-100 text-green-700',
  GBP_POST: 'bg-purple-100 text-purple-700',
  IMPROVEMENT: 'bg-orange-100 text-orange-700'
}

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle,
  CANCELLED: AlertCircle
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800'
}

// Tasks are fetched from database - no mock data needed

export function EnhancedRequestCard({ request }: EnhancedRequestCardProps) {
  const tasks = request.tasks || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{request.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                {request.status.toLowerCase().replace('_', ' ')}
              </Badge>
              <Badge className={priorityColors[request.priority as keyof typeof priorityColors]}>
                {request.priority} Priority
              </Badge>
              {request.packageType && (
                <Badge variant="default">{request.packageType}</Badge>
              )}
            </div>
          </div>
          
          {/* Progress Circle */}
          <div className="text-center">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">Tasks</p>
          </div>
        </div>

        {request.description && (
          <p className="text-gray-600 mt-3 line-clamp-2">{request.description}</p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Target Information */}
        {(request.targetCities?.length || request.targetModels?.length) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {request.targetCities && request.targetCities.length > 0 && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-700">Cities:</span>
                    <p className="text-gray-600">{request.targetCities.slice(0, 3).join(', ')}
                      {request.targetCities.length > 3 && ` +${request.targetCities.length - 3} more`}
                    </p>
                  </div>
                </div>
              )}
              {request.targetModels && request.targetModels.length > 0 && (
                <div className="flex items-start gap-2">
                  <Car className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-700">Models:</span>
                    <p className="text-gray-600">{request.targetModels.slice(0, 3).join(', ')}
                      {request.targetModels.length > 3 && ` +${request.targetModels.length - 3} more`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Summary Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Task Progress</span>
            <span className="text-gray-600">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex gap-4 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {completedTasks} Completed
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {inProgressTasks} In Progress
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              {pendingTasks} Pending
            </span>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm mb-2">Tasks</h4>
          {tasks.slice(0, 4).map((task) => {
            const TypeIcon = typeIcons[task.type]
            const StatusIcon = statusIcons[task.status]
            
            return (
              <div 
                key={task.id} 
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border bg-gray-50",
                  task.status === 'COMPLETED' && "opacity-60"
                )}
              >
                <div className={cn("p-1.5 rounded", typeColors[task.type])}>
                  <TypeIcon className="h-3.5 w-3.5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.targetCity && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {task.targetCity}
                      </span>
                    )}
                    {task.targetModel && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {task.targetModel}
                      </span>
                    )}
                  </div>
                </div>

                <StatusIcon className={cn(
                  "h-4 w-4",
                  task.status === 'COMPLETED' && "text-green-600",
                  task.status === 'IN_PROGRESS' && "text-blue-600",
                  task.status === 'PENDING' && "text-yellow-600"
                )} />
              </div>
            )
          })}
          
          {tasks.length > 4 && (
            <Button variant="ghost" size="sm" className="w-full mt-2">
              View all {tasks.length} tasks
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {request.completedAt 
                ? `Completed ${format(new Date(request.completedAt), 'MMM d, yyyy')}`
                : `Created ${format(new Date(request.createdAt), 'MMM d, yyyy')}`
              }
            </span>
          </div>
          
          <Link href={`/requests/${request.id}`}>
            <Button variant="ghost" size="sm">
              View Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}