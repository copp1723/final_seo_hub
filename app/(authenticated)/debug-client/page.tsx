'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClientDebugPage() {
  const [mounted, setMounted] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [jsEnabled, setJsEnabled] = useState(false)
  
  useEffect(() => {
    // This will only run if JavaScript is working
    setMounted(true)
    setJsEnabled(true)
    
    // Add global error handler
    const handleError = (event: ErrorEvent) => {
      setErrors(prev => [...prev, `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`])
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setErrors(prev => [...prev, `Unhandled Promise Rejection: ${event.reason}`])
    }
    
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  const testApiCall = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      alert(`API Response: ${JSON.stringify(data)}`)
    } catch (error) {
      alert(`API Error: ${error}`)
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Client-Side Debug Page</h1>
      
      <div className="space-y-6">
        {/* JavaScript Status */}
        <Card>
          <CardHeader>
            <CardTitle>JavaScript Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>JavaScript Enabled:</strong>{' '}
                <span className={jsEnabled ? 'text-green-600' : 'text-red-600'}>
                  {jsEnabled ? 'Yes ✓' : 'No ✗'}
                </span>
              </p>
              <p>
                <strong>React Mounted:</strong>{' '}
                <span className={mounted ? 'text-green-600' : 'text-red-600'}>
                  {mounted ? 'Yes ✓' : 'No ✗'}
                </span>
              </p>
              <p>
                <strong>Hydration Status:</strong>{' '}
                {mounted ? 'Successful' : 'Not yet hydrated'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Interactive Test */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Click the button below to test interactivity:</p>
              <Button 
                onClick={() => setClickCount(prev => prev + 1)}
                className="mr-4"
              >
                Click Me ({clickCount})
              </Button>
              <Button 
                onClick={testApiCall}
                variant="outline"
              >
                Test API Call
              </Button>
              {clickCount > 0 && (
                <p className="text-green-600">
                  Button clicked {clickCount} time{clickCount !== 1 ? 's' : ''}! Interactivity is working.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* JavaScript Errors */}
        <Card>
          <CardHeader>
            <CardTitle>JavaScript Errors</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <p className="text-green-600">No JavaScript errors detected ✓</p>
            ) : (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Browser Info */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
              <p><strong>JavaScript Enabled:</strong> {typeof window !== 'undefined' ? 'Yes' : 'No'}</p>
              <p><strong>Cookies Enabled:</strong> {typeof window !== 'undefined' && navigator.cookieEnabled ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Static Content Test */}
        <Card>
          <CardHeader>
            <CardTitle>Static vs Dynamic Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">This is static content from the server.</p>
            {mounted && <p className="text-blue-600">This is dynamic content added by JavaScript!</p>}
          </CardContent>
        </Card>
      </div>
      
      <noscript>
        <div className="mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>JavaScript is disabled!</strong> This application requires JavaScript to function properly.
        </div>
      </noscript>
    </div>
  )
}