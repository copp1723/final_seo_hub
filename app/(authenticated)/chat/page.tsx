'use client'

import { useAuth } from '@/app/simple-auth-provider'
import { useDealership } from '@/app/context/DealershipContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AutomotiveSEOChat } from '@/components/chat/automotive-seo-chat'
import { ChatTest } from '@/components/chat/chat-test'
import { PageLoading } from '@/components/ui/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  const { currentDealership, isLoading: dealershipLoading } = useDealership()
  const router = useRouter()
  const [showDebug, setShowDebug] = useState(false)
  const [apiTest, setApiTest] = useState<string>('')

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/auth/simple-signin')
    }
  }, [user, isLoading, router])

  // Test API endpoint
  const testAPI = async () => {
    try {
      const response = await fetch('/api/chat/automotive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: 'test message',
          dealershipInfo: { brand: 'Test', currentPackage: 'silver' }
        })
      })
      const data = await response.json()
      setApiTest(`API Response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setApiTest(`API Error: ${error}`)
    }
  }

  if (isLoading || dealershipLoading) {
    return <PageLoading />
  }

  if (!user) {
    return null
  }

  // Convert dealership context to chat component format
  const dealershipInfo = currentDealership ? {
    brand: currentDealership.name,
    currentPackage: (currentDealership.activePackageType?.toLowerCase() || 'silver') as 'silver' | 'gold' | 'platinum'
  } : undefined

  return (
    <div className="h-full p-4">
      {/* Debug Panel */}
      <div className="mb-4">
        <Button
          onClick={() => setShowDebug(!showDebug)}
          variant="outline"
          size="sm"
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </Button>
      </div>

      {showDebug && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>User:</strong> {user ? `${user.email} (${user.role})` : 'Not authenticated'}</p>
                <p><strong>Auth Loading:</strong> {isLoading.toString()}</p>
                <p><strong>Dealership Loading:</strong> {dealershipLoading.toString()}</p>
                <p><strong>Current Dealership:</strong> {currentDealership ? `${currentDealership.name} (${currentDealership.activePackageType})` : 'None'}</p>
                <p><strong>Dealership Info:</strong> {JSON.stringify(dealershipInfo)}</p>
                <div className="mt-4">
                  <Button onClick={testAPI} size="sm">Test API</Button>
                  {apiTest && (
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {apiTest}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <ChatTest />
        </div>
      )}

      <div className="h-full">
        <AutomotiveSEOChat dealershipInfo={dealershipInfo} />
      </div>
    </div>
  )
}