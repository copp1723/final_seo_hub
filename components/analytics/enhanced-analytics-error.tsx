import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Settings, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface AnalyticsErrorProps {
  error: string
  service?: 'ga4' | 'search-console' | 'both'
  onRetry?: () => void
  showConnectionGuide?: boolean
  connectionStatus?: {
    ga4?: { connected: boolean; working: boolean; error?: string }
    searchConsole?: { connected: boolean; working: boolean; error?: string }
  }
}

export function EnhancedAnalyticsError({ 
  error, 
  service = 'both',
  onRetry, 
  showConnectionGuide = true,
  connectionStatus 
}: AnalyticsErrorProps) {
  const isConnectionError = error.toLowerCase().includes('not connected') || 
                           error.toLowerCase().includes('no connection') ||
                           error.toLowerCase().includes('not found')
  const isPermissionError = error.toLowerCase().includes('permission') || 
                           error.toLowerCase().includes('access') ||
                           error.toLowerCase().includes('unauthorized')
  const isTokenError = error.toLowerCase().includes('token') || 
                       error.toLowerCase().includes('expired') ||
                       error.toLowerCase().includes('invalid_grant')

  const getErrorType = () => {
    if (isConnectionError) return 'connection'
    if (isPermissionError) return 'permission'
    if (isTokenError) return 'token'
    return 'unknown'
  }

  const getErrorTitle = () => {
    const errorType = getErrorType()
    switch (errorType) {
      case 'connection':
        return 'Analytics Not Connected'
      case 'permission':
        return 'Insufficient Permissions'
      case 'token':
        return 'Authentication Expired'
      default:
        return 'Analytics Error'
    }
  }

  const getErrorSuggestions = () => {
    const errorType = getErrorType()
    switch (errorType) {
      case 'connection':
        return [
          'Connect your Google Analytics 4 account',
          'Connect your Google Search Console account',
          'Ensure you have the necessary permissions'
        ]
      case 'permission':
        return [
          'Check that your Google account has access to the Analytics property',
          'Verify you have Read & Analyze permissions',
          'Ensure the GA4 Data API is enabled in Google Cloud Console',
          'Confirm Search Console site ownership or delegation'
        ]
      case 'token':
        return [
          'Your authentication has expired',
          'Reconnect your Google accounts',
          'Check that cookies and localStorage are enabled'
        ]
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Contact support if the issue persists'
        ]
    }
  }

  const ConnectionStatusIndicator = ({ 
    connected, 
    working, 
    serviceName 
  }: { 
    connected: boolean; 
    working: boolean; 
    serviceName: string 
  }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="font-medium text-gray-700">{serviceName}</span>
      <div className="flex items-center gap-2">
        {connected ? (
          working ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Issues</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Not Connected</span>
          </div>
        )}
      </div>
    </div>
  )
  
  return (
    <Card className="p-8">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{getErrorTitle()}</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        
        {/* Connection Status Display */}
        {connectionStatus && (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Connection Status</h4>
            {connectionStatus.ga4 && (
              <ConnectionStatusIndicator
                connected={connectionStatus.ga4.connected}
                working={connectionStatus.ga4.working}
                serviceName="Google Analytics 4"
              />
            )}
            {connectionStatus.searchConsole && (
              <ConnectionStatusIndicator
                connected={connectionStatus.searchConsole.connected}
                working={connectionStatus.searchConsole.working}
                serviceName="Google Search Console"
              />
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          {isConnectionError || isTokenError ? (
            <Link href="/settings?tab=integrations">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Settings className="h-4 w-4 mr-2" />
                Connect Analytics
              </Button>
            </Link>
          ) : (
            <>
              {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {isPermissionError && (
                <Link href="/settings?tab=integrations">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Check Settings
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Troubleshooting Guide */}
        {showConnectionGuide && (
          <div className="text-left max-w-2xl mx-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Troubleshooting Steps:</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              {getErrorSuggestions().map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
            
            {/* Links to documentation */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 justify-center text-sm">
                <a 
                  href="https://support.google.com/analytics/answer/9304153" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  GA4 Setup Guide
                </a>
                <a 
                  href="https://support.google.com/webmasters/answer/9128668" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Search Console Guide
                </a>
                <Link 
                  href="/docs/analytics-setup" 
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Platform Setup
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// Quick error display for inline usage
export function InlineAnalyticsError({ 
  error, 
  compact = false 
}: { 
  error: string; 
  compact?: boolean 
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    )
  }

  return (
    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-red-800">Analytics Error</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    </div>
  )
}

export default EnhancedAnalyticsError
