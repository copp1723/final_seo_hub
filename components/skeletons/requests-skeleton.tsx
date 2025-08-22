import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BrandedSkeleton } from '@/components/ui/skeleton'

export function RequestsSkeleton() {
  return (
    <div 
      className="min-h-screen bg-blue-50" 
      role="status" 
      aria-label="Loading requests content"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <BrandedSkeleton className="h-9 w-48 mb-2" />
            <BrandedSkeleton className="h-5 w-64" />
          </div>
          <div className="flex gap-3">
            <BrandedSkeleton className="h-10 w-32" />
            <BrandedSkeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6 border-blue-100">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <BrandedSkeleton className="h-10 flex-1" />
              <BrandedSkeleton className="h-10 w-32" />
              <BrandedSkeleton className="h-10 w-32" />
              <BrandedSkeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Request Cards */}
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-blue-100 hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-600">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <BrandedSkeleton className="h-6 w-64" />
                      <BrandedSkeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <BrandedSkeleton className="h-4 w-96" />
                    <div className="flex gap-2">
                      <BrandedSkeleton className="h-6 w-24 rounded-full" />
                      <BrandedSkeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="ml-6 text-right">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <BrandedSkeleton className="h-8 w-16 mb-1" />
                      <BrandedSkeleton className="h-4 w-20 mb-2" />
                      <BrandedSkeleton className="h-2 w-full" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Targets Section */}
                <div className="mb-6">
                  <BrandedSkeleton className="h-5 w-32 mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <BrandedSkeleton className="h-4 w-full" />
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <BrandedSkeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mb-6">
                  <BrandedSkeleton className="h-5 w-36 mb-3" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="text-center">
                        <BrandedSkeleton className="h-4 w-16 mx-auto mb-2" />
                        <BrandedSkeleton className="h-6 w-8 mx-auto mb-1" />
                        <BrandedSkeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Tasks */}
                <div className="space-y-3">
                  <BrandedSkeleton className="h-5 w-32 mb-3" />
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-3 flex-1">
                        <BrandedSkeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1">
                          <BrandedSkeleton className="h-4 w-48" />
                          <BrandedSkeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <BrandedSkeleton className="h-8 w-24 rounded" />
                    </div>
                  ))}
                </div>

                {/* Summary Footer */}
                <div className="mt-6 pt-4 border-t bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <BrandedSkeleton className="h-4 w-40" />
                    <BrandedSkeleton className="h-6 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-center">
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <BrandedSkeleton key={i} className="h-10 w-10 rounded" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Screen reader text */}
      <span className="sr-only">Request list is loading, please wait...</span>
    </div>
  )
}
