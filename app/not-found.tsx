'use client'

import Link from 'next/link'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useBranding } from '@/hooks/use-branding'

export default function NotFound() {
  const branding = useBranding()
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="inline-block">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">
              {branding.companyName}
            </h1>
          </Link>
          
          {/* Error Code */}
          <div className="mb-8">
            <h2 className="text-9xl font-bold text-gray-300">404</h2>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Page Not Found
            </CardTitle>
            <CardDescription className="text-lg">
              Sorry, we couldn't find the page you're looking for. The page may have been moved, deleted, or the URL might be incorrect.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button variant="secondary" asChild className="flex-1">
                <Link href="/requests">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Requests
                </Link>
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Need help? Contact our{' '}
            <Link href="/chat" className="text-blue-600 hover:text-blue-500 underline">
              AI Assistant
            </Link>{' '}
            for support.
          </p>
        </div>
      </div>
    </div>
  )
}