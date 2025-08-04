'use client'

import { useAuth } from '@/app/simple-auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Navigation } from './navigation'
import { PageLoading } from '@/components/ui/loading'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/auth/simple-signin')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <PageLoading />
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
