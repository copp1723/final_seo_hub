'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error with more details
    console.error('App Error:', error)
    logger.error('Application error occurred', error, {
      digest: error.digest,
      stack: error.stack,
      message: error.message
    })
  }, [error])

  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.334 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {isDevelopment ? 'Development Error' : 'Something went wrong!'}
          </h3>
          
          {isDevelopment && (
            <div className="mt-4 text-left space-y-2">
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm font-medium text-red-800">Error Message:</p>
                <p className="text-sm text-red-700 mt-1 font-mono">{error.message}</p>
              </div>
              
              {error.digest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm font-medium text-yellow-800">Digest:</p>
                  <p className="text-xs text-yellow-700 mt-1 font-mono">{error.digest}</p>
                </div>
              )}
              {error.stack && (
                <details className="bg-gray-50 border border-gray-200 rounded p-3">
                  <summary className="text-sm font-medium text-gray-800 cursor-pointer">Stack Trace</summary>
                  <pre className="text-xs text-gray-700 mt-2 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          {!isDevelopment && (
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error has occurred.Our team has been notified</p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
