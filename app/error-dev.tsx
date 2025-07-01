'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function DevError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for development
    console.error('Development Error:', error)
    logger.error('React Error Boundary caught an error', error, {
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.334 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-900 text-center">
            Development Error Details
          </h2>
          
          <div className="mt-4 space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="font-medium text-red-800">Error Message:</h3>
              <p className="mt-1 text-sm text-red-700 font-mono">{error.message}</p>
            </div>
            
            {error.digest && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="font-medium text-yellow-800">Error Digest:</h3>
                <p className="mt-1 text-sm text-yellow-700 font-mono">{error.digest}</p>
              </div>
            )}
            
            {error.stack && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 className="font-medium text-gray-800">Stack Trace:</h3>
                <pre className="mt-1 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reload Page
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 text-center">
            This detailed error page is only shown in development mode.
          </div>
        </div>
      </div>
    </div>
  )
}