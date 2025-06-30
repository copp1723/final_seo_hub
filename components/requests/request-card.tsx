'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface RequestCardProps {
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
  }
}

const statusIcons = {
  PENDING: <Clock className="h-4 w-4" />,
  IN_PROGRESS: <AlertCircle className="h-4 w-4" />,
  COMPLETED: <CheckCircle className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-orange-100 text-orange-800',
  HIGH: 'bg-red-100 text-red-800',
}

export function RequestCard({ request }: RequestCardProps) {
  const totalTasks = request.pagesCompleted + request.blogsCompleted + 
                    request.gbpPostsCompleted + request.improvementsCompleted

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{request.title}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="default" className={priorityColors[request.priority as keyof typeof priorityColors]}>
              {request.priority}
            </Badge>
            <Badge className={`flex items-center gap-1 ${statusColors[request.status as keyof typeof statusColors]}`}>
              {statusIcons[request.status as keyof typeof statusIcons]}
              {request.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {request.description && (
          <p className="text-gray-600 mb-4 line-clamp-2">{request.description}</p>
        )}
        
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div className="flex gap-4">
            <span>Type: {request.type.replace('_', ' ')}</span>
            {request.packageType && (
              <span>Package: {request.packageType}</span>
            )}
            {totalTasks > 0 && (
              <span>Tasks: {totalTasks}</span>
            )}
          </div>
          <div>
            {request.completedAt 
              ? `Completed ${format(new Date(request.completedAt), 'MMM d, yyyy')}`
              : `Created ${format(new Date(request.createdAt), 'MMM d, yyyy')}`
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
}