'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, Mail, Home } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')

  const getErrorDetails = (errorCode: string | null) => {
    switch (errorCode) {
      case 'MissingToken':
        return {
          title: 'Invalid Invitation Link',
          description: 'The invitation link is missing required information. Please check that you copied the complete link from your email.',
          icon: <Mail className="h-12 w-12 text-orange-500" />,
          actions: [
            { label: 'Check Email Again', href: null, action: () => window.history.back() },
            { label: 'Contact Support', href: '/contact', action: null }
          ]
        }
      case 'InvalidToken':
        return {
          title: 'Invitation Link Expired or Invalid',
          description: 'This invitation link has expired or has already been used. Invitation links are single-use and expire after 72 hours.',
          icon: <AlertCircle className="h-12 w-12 text-red-500" />,
          actions: [
            { label: 'Request New Invitation', href: '/auth/request-access', action: null },
            { label: 'Contact Support', href: '/contact', action: null }
          ]
        }
      case 'ServerError':
        return {
          title: 'Server Error',
          description: 'Something went wrong on our end. Please try again in a few moments.',
          icon: <RefreshCw className="h-12 w-12 text-red-500" />,
          actions: [
            { label: 'Try Again', href: null, action: () => router.refresh() },
            { label: 'Go to Sign In', href: '/auth/signin', action: null }
          ]
        }
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication. Please try again.',
          icon: <AlertCircle className="h-12 w-12 text-red-500" />,
          actions: [
            { label: 'Go to Sign In', href: '/auth/signin', action: null },
            { label: 'Go Home', href: '/', action: null }
          ]
        }
    }
  }

  const errorDetails = getErrorDetails(error)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            GSEO Hub
          </Link>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {errorDetails.icon}
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {errorDetails.title}
            </CardTitle>
            <CardDescription className="mt-2 text-gray-600">
              {errorDetails.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {errorDetails.actions.map((action, index) => (
                action.href ? (
                  <Link key={index} href={action.href} className="w-full">
                    <Button 
                      variant={index === 0 ? "default" : "outline"} 
                      className="w-full"
                    >
                      {action.label}
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    key={index}
                    variant={index === 0 ? "default" : "outline"} 
                    className="w-full"
                    onClick={action.action || undefined}
                  >
                    {action.label}
                  </Button>
                )
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                  <Home className="h-4 w-4 mr-1" />
                  Back to Home
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="mt-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Need Help?</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    If you continue to have issues, please contact your administrator or check your email for a new invitation link.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
