'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/error-boundary'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        {children}
        <Toaster position="top-center" richColors />
      </SessionProvider>
    </ErrorBoundary>
  )
}