import { SimpleAuth } from '@/lib/auth-simple'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { Toaster } from '@/components/ui/toaster'

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await SimpleAuth.getSession()
  
  if (!session) {
    redirect('/auth/simple-signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>{children}</main>
      <Toaster />
    </div>
  )
}
