import { redirect } from 'next/navigation'
import { SimpleAuth } from '@/lib/auth-simple'

export default async function Home() {
  // EMERGENCY BYPASS - Always redirect to dashboard
  redirect('/dashboard')
}
