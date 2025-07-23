import { redirect } from 'next/navigation'
import { SimpleAuth } from '@/lib/auth-simple'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

export default async function Home() {
  // Check if user is authenticated
  const session = await SimpleAuth.getSession()
  
  if (session) {
    // Redirect authenticated users to dashboard
    redirect('/dashboard')
  } else {
    // Redirect unauthenticated users to sign in
    redirect('/login')
  }
}
