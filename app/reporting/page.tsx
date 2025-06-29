'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoading } from '@/components/ui/loading'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ReportingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ga4Connected, setGa4Connected] = useState(false)
  const [searchConsoleConnected, setSearchConsoleConnected] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    checkConnections()
  }, [session, status, router])

  const checkConnections = async () => {
    // TODO: Check actual connection status
    setLoading(false)
  }

  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Your source of truth for traffic and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Google Analytics 4</CardTitle>
          </CardHeader>
          <CardContent>
            {ga4Connected ? (
              <div>
                <p className="text-sm text-green-600 mb-4">✓ Connected</p>
                {/* GA4 metrics would go here */}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">Connect your GA4 account to see traffic data</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  Connect GA4 →
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Search Console</CardTitle>
          </CardHeader>
          <CardContent>
            {searchConsoleConnected ? (
              <div>
                <p className="text-sm text-green-600 mb-4">✓ Connected</p>
                {/* Search Console metrics would go here */}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">Connect Search Console to see search performance</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  Connect Search Console →
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Definitive Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Is my traffic up or down?</h3>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <p className="text-sm">Traffic is down 12% compared to last month</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                This is primarily due to seasonal trends and increased competition in your market.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">What's driving the change?</h3>
              <ul className="text-sm space-y-1">
                <li>• Organic search: -18% (main driver)</li>
                <li>• Direct traffic: +5%</li>
                <li>• Social media: -2%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}