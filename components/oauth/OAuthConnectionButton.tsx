'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BrowserCompatibilityCheck } from './BrowserCompatibilityCheck'
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'

interface OAuthConnectionButtonProps {
  service: 'ga4' | 'search-console'
  onConnect: () => void
  isConnected?: boolean
  isLoading?: boolean
}

export function OAuthConnectionButton({ 
  service, 
  onConnect, 
  isConnected = false, 
  isLoading = false 
}: OAuthConnectionButtonProps) {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  const serviceName = service === 'ga4' ? 'Google Analytics 4' : 'Google Search Console'

  const handleConnect = () => {
    setConnectionAttempts(prev => prev + 1)
    onConnect()
  }

  const openInNewWindow = () => {
    const width = 600
    const height = 700
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    const popup = window.open(
      '',
      'oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )

    if (popup) {
      // Add popup parameter to the connect URL
      const connectUrl = service === 'search-console'
        ? '/api/search-console/connect?popup=true'
        : '/api/ga4/auth/connect?popup=true'

      popup.location.href = connectUrl

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'oauth_result') {
          window.removeEventListener('message', handleMessage)

          if (event.data.success) {
            // Connection successful - refresh the page
            window.location.reload()
          } else {
            // Connection failed - show error
            console.error('OAuth connection failed:', event.data.error)
          }
        }
      }

      window.addEventListener('message', handleMessage)

      // Fallback: Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          // Refresh the page to check connection status
          window.location.reload()
        }
      }, 1000)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
        {serviceName} connected
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleConnect}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Connect {serviceName}
        </Button>
        
        {connectionAttempts > 0 && (
          <Button 
            variant="outline" 
            onClick={openInNewWindow}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Try in Popup
          </Button>
        )}
      </div>

      {connectionAttempts > 1 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
          >
            <AlertCircle className="h-4 w-4" />
            Having trouble connecting?
          </Button>

          {showTroubleshooting && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <BrowserCompatibilityCheck />
              
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  Alternative connection methods:
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Try the "Try in Popup" button above</div>
                  <div>• Use an incognito/private browser window</div>
                  <div>• Temporarily disable browser extensions</div>
                  <div>• Check if your corporate firewall blocks Google OAuth</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
