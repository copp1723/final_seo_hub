'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, FileText, Newspaper, BarChart3, Zap } from 'lucide-react' // Icons for items

interface PackageUsageProgressProps {
  usageData: {
    pages?: number
    blogs?: number
    gbpPosts?: number
    improvements?: number
    // Add other package items here if they exist
  }
  // Optionally, add a 'quotas' prop if you want to show progress against a target
  // quotas?: {
  //   pages?: number
  //   blogs?: number
  //   gbpPosts?: number
  //   improvements?: number
  // }
}

interface UsageItem {
  name: string
  value: number
  icon: React.ElementType
  // max?: number // Future: for progress against a target
}

const PackageUsageProgress: React.FC<PackageUsageProgressProps> = ({ usageData }) => {
  const items: UsageItem[] = [
    { name: 'Pages', value: usageData.pages || 0, icon: FileText },
    { name: 'Blog Posts', value: usageData.blogs || 0, icon: Newspaper },
    { name: 'GBP Posts', value: usageData.gbpPosts || 0, icon: BarChart3 },
    { name: 'Improvements', value: usageData.improvements || 0, icon: Zap },
  ]

  const totalUsage = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Monthly Package Usage</CardTitle>
        <Briefcase className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {totalUsage > 0 ? (
          <div className="space-y-4">
            {items.map((item, index) => (
              item.value > 0 && ( // Only show items with usage
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <item.icon className="h-4 w-4 mr-2 text-indigo-600" />
                      {item.name}
                    </span>
                    <span className="text-sm font-semibold text-indigo-600">{item.value}</span>
                  </div>
                  {/* Basic representation of usage amount. Could be a real progress bar if max is known. */}
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-indigo-600 rounded-full"
                      style={{ width: `${item.value > 0 ? '100%' : '0%'}` }} // Shows full bar for any usage, as no 'max'
                      // Example if max was available: style={{ width: `${(item.value / (item.max || item.value)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-500">
            No package usage recorded this month.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PackageUsageProgress
