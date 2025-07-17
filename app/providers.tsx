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

  // Always wrap in ErrorBoundary, but delay auth provider until mounted
  return (
    <ErrorBoundary>
      {mounted ? (
        <SimpleAuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </SimpleAuthProvider>
      ) : (
        <>
          {children}
          <Toaster position="top-center" richColors />
        </>
      )}
    </ErrorBoundary>
  )
}
