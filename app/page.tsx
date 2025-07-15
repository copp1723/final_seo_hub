import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function Home() {
  // Check if user is authenticated before redirecting
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  } else {
    redirect('/dashboard')
  }
}
