'use client'

import { SimpleAuthProvider } from './simple-auth-provider'
import { DealershipProvider } from './context/DealershipContext'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/error-boundary'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SimpleAuthProvider>
        <DealershipProvider>
          {children}
          <Toaster position="top-center" richColors />
        </DealershipProvider>
      </SimpleAuthProvider>
    </ErrorBoundary>
  )
}
