'use client'

import { SimpleAuthProvider } from './simple-auth-provider'
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
      <SimpleAuthProvider>
        {children}
        <Toaster position="top-center" richColors />
      </SimpleAuthProvider>
    </ErrorBoundary>
  )
}
