import { Navigation } from '@/components/layout/navigation'
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
      <main>{children}</main>
      <Toaster />
    </div>
  )
}
