'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarClock, AlertCircle, CheckCircle2 } from 'lucide-react' // Icons for tasks

interface Task {
  id: string
  title: string
  dueDate: string // Formatted due date string
  daysRemaining: number
  status: string // e.g., 'IN_PROGRESS', 'PENDING'
}

interface UpcomingTasksProps {
  tasks: Task[]
}

const getTaskVariant = (daysRemaining: number, status: string) => {
  if (status === 'COMPLETED') return { icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, color: 'text-green-700', chipColor: 'bg-green-100 text-green-700' }
  if (daysRemaining < 0) return { icon: <AlertCircle className="h-5 w-5 text-red-500" />, color: 'text-red-700', chipColor: 'bg-red-100 text-red-700' } // Overdue
  if (daysRemaining <= 3) return { icon: <AlertCircle className="h-5 w-5 text-yellow-500" />, color: 'text-yellow-700', chipColor: 'bg-yellow-100 text-yellow-700' } // Due soon
  return { icon: <CalendarClock className="h-5 w-5 text-blue-500" />, color: 'text-blue-700', chipColor: 'bg-blue-100 text-blue-700' } // Upcoming
}

export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ tasks }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Upcoming Deadlines</CardTitle>
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => {
              const variant = getTaskVariant(task.daysRemaining, task.status)
              return (
                <div key={task.id} className={`p-3 rounded-md border flex items-start space-x-3 ${variant.chipColor.split(' ')[0].replace('bg-', 'border-')}`}>
                  <div className="flex-shrink-0 pt-0.5">
                    {variant.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${variant.color}`}>{task.title}</p>
                    <p className="text-xs text-gray-600">
                      Due: {task.dueDate}
                      {task.daysRemaining !== Infinity && (
                         <span className={`ml-2 font-semibold ${task.daysRemaining < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                           ({task.daysRemaining < 0 ? `${Math.abs(task.daysRemaining)} days overdue` : `${task.daysRemaining} days remaining`})
                         </span>
                      )}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${variant.chipColor}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-500">
            No upcoming deadlines in the next 7 days.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingTasks
