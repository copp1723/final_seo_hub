'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'

interface GA4Metrics {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  sessionDuration: number
  trend: 'up' | 'down' | 'stable'
  percentageChange: number
}

interface SearchConsoleMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  trend: 'up' | 'down' | 'stable'
  percentageChange: number
}

export default function ReportingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ga4Connected, setGa4Connected] = useState(false)
  const [searchConsoleConnected, setSearchConsoleConnected] = useState(false)
  const [ga4Metrics, setGa4Metrics] = useState<GA4Metrics | null>(null)
  const [scMetrics, setSCMetrics] = useState<SearchConsoleMetrics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    checkConnections()
  }, [session, status, router])

  const checkConnections = async () => {
    try {
      // Check GA4 connection
      const ga4Response = await fetch('/api/ga4/status')
      const ga4Data = await ga4Response.json()
      setGa4Connected(ga4Data.connected)
      
      if (ga4Data.connected && ga4Data.metrics) {
        setGa4Metrics(ga4Data.metrics)
      }

      // Check Search Console connection
      const scResponse = await fetch('/api/search-console/status')
      const scData = await scResponse.json()
      setSearchConsoleConnected(scData.connected)
      
      if (scData.connected && scData.metrics) {
        setSCMetrics(scData.metrics)
      }
    } catch (err) {
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const connectGA4 = () => {
    window.location.href = '/api/ga4/auth/connect'
  }

  const connectSearchConsole = () => {
    window.location.href = '/api/search-console/connect'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const getTrafficStatus = () => {
    if (!ga4Metrics && !scMetrics) return null
    
    const primaryMetric = ga4Metrics || scMetrics
    if (!primaryMetric) return null

    const trend = primaryMetric.trend
    const change = primaryMetric.percentageChange

    return {
      trend,
      change,
      message: trend === 'up' 
        ? `Traffic is up ${Math.abs(change)}% compared to last period`
        : trend === 'down'
        ? `Traffic is down ${Math.abs(change)}% compared to last period`
        : 'Traffic is stable compared to last period'
    }
  }

  const trafficStatus = getTrafficStatus()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Your source of truth for traffic and performance</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Google Analytics 4
              {ga4Connected && <CheckCircle className="h-5 w-5 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ga4Connected && ga4Metrics ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Sessions</p>
                    <p className="text-xl font-semibold">{ga4Metrics.sessions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Users</p>
                    <p className="text-xl font-semibold">{ga4Metrics.users.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pageviews</p>
                    <p className="text-xl font-semibold">{ga4Metrics.pageviews.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Bounce Rate</p>
                    <p className="text-xl font-semibold">{ga4Metrics.bounceRate}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">Connect your GA4 account to see traffic data</p>
                <Button onClick={connectGA4} size="sm">
                  Connect GA4
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Google Search Console
              {searchConsoleConnected && <CheckCircle className="h-5 w-5 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchConsoleConnected && scMetrics ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Clicks</p>
                    <p className="text-xl font-semibold">{scMetrics.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Impressions</p>
                    <p className="text-xl font-semibold">{scMetrics.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">CTR</p>
                    <p className="text-xl font-semibold">{scMetrics.ctr}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg Position</p>
                    <p className="text-xl font-semibold">{scMetrics.position.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">Connect Search Console to see search performance</p>
                <Button onClick={connectSearchConsole} size="sm">
                  Connect Search Console
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(ga4Connected || searchConsoleConnected) && trafficStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Definitive Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Is my traffic up or down?</h3>
                <div className="flex items-center gap-2">
                  {trafficStatus.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : trafficStatus.trend === 'down' ? (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  ) : (
                    <div className="h-5 w-5 text-gray-600">→</div>
                  )}
                  <p className="text-sm">{trafficStatus.message}</p>
                </div>
              </div>

              {ga4Metrics && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">What's driving the change?</h3>
                  <p className="text-sm text-gray-600">
                    Based on your GA4 data, sessions are {ga4Metrics.trend} with {ga4Metrics.sessions.toLocaleString()} total sessions.
                    Your average session duration is {Math.round(ga4Metrics.sessionDuration / 60)} minutes.
                  </p>
                </div>
              )}

              {scMetrics && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Search Performance</h3>
                  <p className="text-sm text-gray-600">
                    Your search visibility shows {scMetrics.impressions.toLocaleString()} impressions with a {scMetrics.ctr}% click-through rate.
                    Average position is {scMetrics.position.toFixed(1)}.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}