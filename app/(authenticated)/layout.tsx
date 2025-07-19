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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <Navigation />
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DealershipSelector />
        </div>
      </div>
      <main className="relative">{children}</main>
      <Toaster />
    </div>
  )
}
