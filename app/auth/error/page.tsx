'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/loading'

const ERROR_MESSAGES: Record<string, { title: string; message: string; showContact: boolean }> = {
  Configuration: {
    title: 'Server Configuration Error',
    message: 'There is a problem with the server configuration.',
    showContact: true
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'You need an invitation to access this application. Please contact an administrator if you believe you should have access.',
    showContact: true
  },
  Verification: {
    title: 'Verification Error',
    message: 'The verification token has expired or has already been used.',
    showContact: false
  },
  Default: {
    title: 'Authentication Error',
    message: 'An error occurred during authentication.',
    showContact: true
  },
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorInfo = ERROR_MESSAGES[error || 'Default'] || ERROR_MESSAGES.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{errorInfo.title}</h2>
          <p className="mt-2 text-sm text-gray-600">{errorInfo.message}</p>

          {errorInfo.showContact && (
            <p className="mt-4 text-xs text-gray-500">
              Need help? Contact your administrator or support team.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href="/auth/signin">Try Again</Link>
          </Button>

          {error === 'AccessDenied' && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to Home</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ErrorContent />
    </Suspense>
  )
}