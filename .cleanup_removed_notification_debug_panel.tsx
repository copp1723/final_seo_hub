'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

export function NotificationDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    try {
      // Test 1: Check notification preferences API
      try {
        const prefsRes = await fetch('/api/user/preferences')
        results.tests.userPreferences = {
          status: prefsRes.ok ? 'success' : 'error',
          statusCode: prefsRes.status,
          data: prefsRes.ok ? await prefsRes.json() : null,
          error: prefsRes.ok ? null : `HTTP ${prefsRes.status}`
        }
      } catch (err) {
        results.tests.userPreferences = {
          status: 'error',
          error: 'Network error or API not found'
        }
      }

      // Test 2: Check settings notifications API  
      try {
        const settingsRes = await fetch('/api/settings/notifications')
        results.tests.settingsNotifications = {
          status: settingsRes.ok ? 'success' : 'error',
          statusCode: settingsRes.status,
          data: settingsRes.ok ? await settingsRes.json() : null,
          error: settingsRes.ok ? null : `HTTP ${settingsRes.status}`
        }
      } catch (err) {
        results.tests.settingsNotifications = {
          status: 'error',
          error: 'Network error or API not found'
        }
      }

      // Test 3: Check email preview
      try {
        const previewRes = await fetch('/api/email/preview/content?type=page')
        results.tests.emailPreview = {
          status: previewRes.ok ? 'success' : 'error',
          statusCode: previewRes.status,
          error: previewRes.ok ? null : `HTTP ${previewRes.status}`
        }
      } catch (err) {
        results.tests.emailPreview = {
          status: 'error',
          error: 'Network error or API not found'
        }
      }

      // Test 4: Check email health
      try {
        const healthRes = await fetch('/api/health/email')
        results.tests.emailHealth = {
          status: healthRes.ok ? 'success' : 'error',
          statusCode: healthRes.status,
          data: healthRes.ok ? await healthRes.json() : null,
          error: healthRes.ok ? null : `HTTP ${healthRes.status}`
        }
      } catch (err) {
        results.tests.emailHealth = {
          status: 'error',
          error: 'Network error or API not found'
        }
      }

      setDebugInfo(results)
    } catch (err) {
      setError('Failed to run diagnostics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50'
      case 'error': return 'border-red-200 bg-red-50'
      default: return 'border-yellow-200 bg-yellow-50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Notification System Diagnostics
          <Button 
            size="sm" 
            variant="outline" 
            onClick={runDiagnostics} 
            disabled={loading}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </CardTitle>
        <CardDescription>
          Debug information for notification system issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {debugInfo && (
          <div className="space-y-3">
            {Object.entries(debugInfo.tests).map(([testName, result]: [string, any]) => (
              <div key={testName} className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{testName}</span>
                  {result.statusCode && (
                    <Badge variant="outline" className="text-xs">
                      {result.statusCode}
                    </Badge>
                  )}
                </div>
                
                {result.error && (
                  <p className="text-sm text-red-700 mb-2">Error: {result.error}</p>
                )}
                
                {result.data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium mb-1">Response Data</summary>
                    <pre className="bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {debugInfo && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">🛠️ Quick Fixes:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• If user preferences fails: Check auth and database connection</li>
              <li>• If settings notifications fails: Verify API endpoint exists</li>
              <li>• If email preview fails: Check email template and Mailgun config</li>
              <li>• If email health fails: Verify Mailgun environment variables</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}