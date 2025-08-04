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

  // Debug logging
  console.log('🔍 ChatPage render:', {
    user: user ? { email: user.email, role: user.role } : null,
    isLoading,
    currentDealership: currentDealership ? { name: currentDealership.name, type: currentDealership.activePackageType } : null,
    dealershipLoading
  })

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
    <div className="min-h-screen p-4 bg-gray-50">
      {/* Always visible debug info at top */}
      <div className="mb-6 bg-yellow-100 border border-yellow-400 rounded-lg p-4">
        <h2 className="text-lg font-bold text-yellow-800 mb-2">🔧 DEBUG MODE ACTIVE</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>User:</strong> {user ? `${user.email} (${user.role})` : 'Not authenticated'}</p>
            <p><strong>Auth Loading:</strong> {isLoading.toString()}</p>
            <p><strong>Dealership Loading:</strong> {dealershipLoading.toString()}</p>
          </div>
          <div>
            <p><strong>Current Dealership:</strong> {currentDealership ? `${currentDealership.name} (${currentDealership.activePackageType})` : 'None'}</p>
            <p><strong>Dealership Info:</strong> {JSON.stringify(dealershipInfo)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={testAPI} size="sm" variant="outline">Test API</Button>
          <Button
            onClick={() => setShowDebug(!showDebug)}
            size="sm"
            variant="outline"
          >
            {showDebug ? 'Hide' : 'Show'} Test Chat
          </Button>
        </div>
        {apiTest && (
          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40 border">
            {apiTest}
          </pre>
        )}
      </div>

      {/* Test Chat Component */}
      {showDebug && (
        <div className="mb-6">
          <ChatTest />
        </div>
      )}

      {/* Main Chat */}
      <div className="bg-white rounded-lg shadow-lg">
        <AutomotiveSEOChat dealershipInfo={dealershipInfo} />
      </div>
    </div>
  )
}