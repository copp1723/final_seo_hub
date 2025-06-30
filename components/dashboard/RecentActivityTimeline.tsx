'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListChecks, History, FilePlus, FileWarning } from 'lucide-react' // Example icons

interface Activity {
  id: string
  description: string
  time: string // Already formatted time string
}

interface RecentActivityTimelineProps {
  activities: Activity[]
}

// Helper to get an icon based on activity description (simple example)
const getActivityIcon = (description: string) => {
  if (description.includes('created')) return <FilePlus className="h-5 w-5 text-green-500" />
  if (description.includes('status changed to COMPLETED')) return <ListChecks className="h-5 w-5 text-blue-500" />
  if (description.includes('status changed to CANCELLED')) return <FileWarning className="h-5 w-5 text-red-500" />
  return <History className="h-5 w-5 text-gray-500" /> // Default icon
}

export const RecentActivityTimeline: React.FC<RecentActivityTimelineProps> = ({ activities }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        <History className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-0.5">
                  {getActivityIcon(activity.description)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-500">
            No recent activity to display.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentActivityTimeline
