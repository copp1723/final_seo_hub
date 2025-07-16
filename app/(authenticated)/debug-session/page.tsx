'use client'

import { useAuth } from '@/app/simple-auth-provider'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugSessionPage() {
  const { user, isLoading } = useAuth()
  const [cookies, setCookies] = useState<string>('')
  const [sessionData, setSessionData] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie)

    // Fetch session from API
    fetch('/api/auth/simple-session')
      .then(res => res.json())
      .then(data => setSessionData(data))
      .catch(err => setError(err.toString()))
  }, [])

  const handleSignIn = () => {
    window.location.href = '/auth/simple-signin'
  }

  const handleClearCookies = () => {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.reload()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Session Debug Information</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {isLoading ? 'loading' : (user ? 'authenticated' : 'unauthenticated')}</p>
              <p><strong>Session Data:</strong></p>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Session Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
            {error && <p className="text-red-600 mt-2">Error: {error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {cookies || 'No cookies found'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
              <p><strong>Location:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
              <p><strong>Protocol:</strong> {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={handleSignIn}>Sign In</Button>
          <Button onClick={handleClearCookies} variant="destructive">Clear All Cookies</Button>
          <Button onClick={() => window.location.reload()} variant="outline">Reload Page</Button>
        </div>
      </div>
    </div>
  )
}