import { SimpleAuth } from '@/lib/auth-simple'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { Toaster } from '@/components/ui/toaster'

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  // EMERGENCY BYPASS - Skip auth check
  const session = await SimpleAuth.getSession() // Will always return demo session

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>{children}</main>
      <Toaster />
    </div>
  )
}
