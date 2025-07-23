import { Navigation } from '@/components/layout/navigation'
import { Toaster } from '@/components/ui/toaster'
import { SimpleAuth } from '@/lib/auth-simple'
import { redirect } from 'next/navigation'

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const session = await SimpleAuth.getSession()
  
  if (!session) {
    // Redirect unauthenticated users to sign in
    redirect('/auth/simple-signin')
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <Navigation />
      <main className="relative">{children}</main>
      <Toaster />
    </div>
  )
}
