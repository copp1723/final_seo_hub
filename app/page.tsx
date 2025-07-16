import { redirect } from 'next/navigation'
import { SimpleAuth } from '@/lib/auth-simple'

export default async function Home() {
  // Check if user is authenticated before redirecting
  const session = await SimpleAuth.getSession()

  if (!session) {
    redirect('/auth/simple-signin')
  } else {
    redirect('/dashboard')
  }
}
