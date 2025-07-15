'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandingConfig, getBrandingFromDomain, DEFAULT_BRANDING } from '@/lib/branding/config'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use a safer approach for branding in global error to avoid hook dependency issues
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING)

  useEffect(() => {
    // Safely get branding without depending on session hooks
    if (typeof window !== 'undefined') {
      try {
        const domainBranding = getBrandingFromDomain(window.location.hostname)
        setBranding(domainBranding)
      } catch (err) {
        // Fallback to default branding if there's any error
        setBranding(DEFAULT_BRANDING)
      }
    }
  }, [])
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            {/* Logo/Brand */}
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-gray-900 mb-8">
                {branding.companyName}
              </h1>
            </Link>
            
            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-red-100 p-6">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-lg">
                We encountered an unexpected error.Our team has been notified and is working to fix this issue</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Error Details (Development Only)
                  </h4>
                  <p className="text-sm text-red-700 font-mono break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-red-600 mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={reset} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button variant="secondary" asChild className="flex-1">
                  <Link href="/dashboard">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            <p>
              If this problem persists, please visit your{' '}
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-500 underline">
                Dashboard
              </Link>{' '}
              or contact support</p>
          </div>
        </div>
      </body>
    </html>
  )
}
