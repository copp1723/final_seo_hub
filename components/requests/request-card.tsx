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
  CANCELLED: <XCircle className="h-4 w-4" />
}

const statusColors = {
  PENDING: 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200/60',
  IN_PROGRESS: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200/60',
  COMPLETED: 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200/60',
  CANCELLED: 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200/60'
}

const priorityColors = {
  LOW: 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-200/60',
  MEDIUM: 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200/60',
  HIGH: 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200/60'
}

export function RequestCard({ request }: RequestCardProps) {
  const totalTasks = request.pagesCompleted + request.blogsCompleted + 
                    request.gbpPostsCompleted + request.improvementsCompleted

  return (
    <Card className="hover-lift">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-slate-900">{request.title}</CardTitle>
          <div className="flex gap-2">
            <Badge className={`${priorityColors[request.priority as keyof typeof priorityColors]} shadow-sm border`}>
              {request.priority}
            </Badge>
            <Badge className={`flex items-center gap-1 ${statusColors[request.status as keyof typeof statusColors]} shadow-sm border`}>
              {statusIcons[request.status as keyof typeof statusIcons]}
              {request.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {request.description && (
          <p className="text-body mb-4 line-clamp-2">{request.description}</p>
        )}
        <div className="flex justify-between items-center text-body-sm">
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
