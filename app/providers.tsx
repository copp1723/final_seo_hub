'use client'

import { SimpleAuthProvider } from './simple-auth-provider'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/error-boundary'
import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SimpleAuthProvider>
        {children}
        <Toaster position="top-center" richColors />
      </SimpleAuthProvider>
    </ErrorBoundary>
  )
}
