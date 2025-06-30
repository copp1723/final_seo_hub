import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Settings } from 'lucide-react'

interface AnalyticsErrorProps {
  error: string
  onRetry?: () => void
}

export function AnalyticsError({ error, onRetry }: AnalyticsErrorProps) {
  const isConnectionError = error.toLowerCase().includes('not connected')
  const isPermissionError = error.toLowerCase().includes('permission') || error.toLowerCase().includes('access')
  
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Unable to load analytics</h3>
      <p className="text-gray-600 mb-6">{error}</p>
      
      <div className="flex justify-center gap-4">
        {isConnectionError ? (
          <Button onClick={() => window.location.href = '/settings'}>
            <Settings className="h-4 w-4 mr-2" />
            Connect Google Analytics
          </Button>
        ) : (
          <>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {isPermissionError && (
              <Button onClick={() => window.location.href = '/settings'}>
                <Settings className="h-4 w-4 mr-2" />
                Check Permissions
              </Button>
            )}
          </>
        )}
      </div>
      
      {isPermissionError && (
        <div className="mt-6 text-sm text-gray-500 max-w-md mx-auto">
          <p>Make sure your Google account has access to the Analytics property and the following permissions:</p>
          <ul className="list-disc list-inside mt-2 text-left">
            <li>Read & Analyze permissions</li>
            <li>Access to the GA4 property</li>
            <li>Data API enabled in Google Cloud Console</li>
          </ul>
        </div>
      )}
    </Card>
  )
}