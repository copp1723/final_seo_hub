import { Navigation } from '@/components/layout/navigation'
import { DealershipSelector } from '@/components/layout/dealership-selector'
import { Toaster } from '@/components/ui/toaster'

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  // AUTO-LOGIN: No auth checks needed
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <DealershipSelector />
        </div>
      </div>
      <main>{children}</main>
      <Toaster />
    </div>
  )
}
