import { Navigation } from '@/components/layout/navigation'
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
      <main className="relative">{children}</main>
      <Toaster />
    </div>
  )
}
