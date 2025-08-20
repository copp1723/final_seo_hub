'use client'

import { SimpleAuthProvider } from './simple-auth-provider'
import { DealershipProvider } from './context/DealershipContext'
import { Toaster } from 'sonner'
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SimpleAuthProvider>
      <DealershipProvider>
        {children}
        <Toaster position="top-center" richColors />
      </DealershipProvider>
    </SimpleAuthProvider>
  )
}
