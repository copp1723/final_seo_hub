'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [ga4Loading, setGA4Loading] = useState(false)
  const [scLoading, setSCLoading] = useState(false)
  const [connections, setConnections] = useState({
    ga4: false,
    searchConsole: false
  })

  const handleGA4Connect = () => {
    setGA4Loading(true)
    toast({
      title: 'Coming Soon',
      description: 'GA4 integration will be available soon. For now, analytics will show placeholder data.',
      variant: 'default'
    })
    setTimeout(() => setGA4Loading(false), 1000)
  }

  const handleSearchConsoleConnect = () => {
    setSCLoading(true)
    toast({
      title: 'Coming Soon',
      description: 'Search Console integration will be available soon. For now, search data will show placeholder values.',
      variant: 'default'
    })
    setTimeout(() => setSCLoading(false), 1000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-1">Connect your analytics and search tools to unlock powerful insights</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Analytics 4 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Google Analytics 4</CardTitle>
              <Badge variant={connections.ga4 ? 'success' : 'secondary'}>
                {connections.ga4 ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            <CardDescription>
              Track website traffic, user behavior, and conversion metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>Real-time visitor tracking</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>Conversion and goal tracking</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>User behavior insights</p>
                </div>
              </div>

              {!connections.ga4 && (
                <Button 
                  onClick={handleGA4Connect}
                  disabled={ga4Loading}
                  className="w-full"
                >
                  {ga4Loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect GA4
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {connections.ga4 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    Connected to property: <strong>example-property</strong>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Search Console */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Google Search Console</CardTitle>
              <Badge variant={connections.searchConsole ? 'success' : 'secondary'}>
                {connections.searchConsole ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            <CardDescription>
              Monitor search performance and optimize visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>Search rankings and impressions</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>Click-through rate analysis</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>Keyword performance tracking</p>
                </div>
              </div>

              {!connections.searchConsole && (
                <Button 
                  onClick={handleSearchConsoleConnect}
                  disabled={scLoading}
                  className="w-full"
                >
                  {scLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect Search Console
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}

              {connections.searchConsole && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    Connected to site: <strong>example.com</strong>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="flex items-start space-x-3 pt-6">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Analytics Integration Status
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Google Analytics and Search Console integrations are being configured. 
              Dashboard will show sample data until connections are established.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}