import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BrandedSkeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div 
      className="min-h-screen bg-blue-50" 
      role="status" 
      aria-label="Loading dashboard content"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <BrandedSkeleton className="h-9 w-48 mb-2" />
          <BrandedSkeleton className="h-5 w-64" />
        </div>
        
        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-blue-100 hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex justify-between items-center">
                  <BrandedSkeleton className="h-4 w-24" />
                  <BrandedSkeleton className="h-4 w-4 rounded" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <BrandedSkeleton className="h-8 w-16 mb-2" />
                <BrandedSkeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Card */}
        <Card className="border-blue-100 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
            <BrandedSkeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <BrandedSkeleton className="h-10 w-full" />
              <BrandedSkeleton className="h-10 w-full" />
            </div>
            {/* Additional content rows */}
            <div className="space-y-4">
              <BrandedSkeleton className="h-4 w-full" />
              <BrandedSkeleton className="h-4 w-3/4" />
              <BrandedSkeleton className="h-4 w-5/6" />
            </div>
          </CardContent>
        </Card>

        {/* Charts/Analytics Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-blue-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
              <BrandedSkeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="pt-6">
              <BrandedSkeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          
          <Card className="border-blue-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
              <BrandedSkeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <BrandedSkeleton className="h-4 w-32" />
                    <BrandedSkeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Screen reader text */}
      <span className="sr-only">Dashboard is loading, please wait...</span>
    </div>
  )
}
