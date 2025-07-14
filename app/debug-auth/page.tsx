'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugAuthPage() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [authConfig, setAuthConfig] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    // Check if auth configuration is available
    fetch('/api/auth/providers')
      .then(res => res.json())
      .then(data => setAuthConfig(data))
      .catch(err => console.error('Failed to fetch auth config:', err))
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> {status}</p>
              <p><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</p>
              {session && (
                <div>
                  <p><strong>User Email:</strong> {session.user?.email}</p>
                  <p><strong>User ID:</strong> {session.user?.id}</p>
                  <p><strong>User Role:</strong> {(session.user as any)?.role}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {authConfig ? JSON.stringify(authConfig, null, 2) : 'Loading...'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
              <p><strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL || 'Not set'}</p>
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
