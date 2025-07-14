'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/error-boundary'
import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration issues by not rendering session-dependent content until mounted
  if (!mounted) {
    return (
      <ErrorBoundary>
        {children}
        <Toaster position="top-center" richColors />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <SessionProvider
        // Add some resilience options
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={true}
      >
        {children}
        <Toaster position="top-center" richColors />
      </SessionProvider>
    </ErrorBoundary>
  )
}