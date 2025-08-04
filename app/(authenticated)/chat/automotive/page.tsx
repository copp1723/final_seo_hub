import { AutomotiveSEOChat } from '@/components/chat/automotive-seo-chat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Car, TrendingUp, Target } from 'lucide-react'

export default function AutomotiveChatPage() {
  // In production, this would come from user session/database
  const dealershipInfo = {
    currentPackage: 'gold' as const
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Automotive SEO Expert Assistant</h1>
        <p className="text-sm text-gray-600">
          Advanced AI-powered SEO consultation for automotive dealerships
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Main Chat Interface */}
        <div className="lg:col-span-2 min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle>SEO Consultation</CardTitle>
              <CardDescription>
                Get expert advice on inventory optimization, local rankings, and lead generation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <AutomotiveSEOChat dealershipInfo={dealershipInfo} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Features */}
        <div className="space-y-6">
          {/* Expertise Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Expertise Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Car className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Inventory SEO</p>
                    <p className="text-xs text-gray-600">VDP/SRP optimization, schema markup</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Local Search</p>
                    <p className="text-xs text-gray-600">GBP optimization, "near me" queries</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Performance Analytics</p>
                    <p className="text-xs text-gray-600">KPI tracking, ROI measurement</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Package</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SEO Package:</span>
                  <Badge className="capitalize bg-yellow-100 text-yellow-800">
                    {dealershipInfo.currentPackage}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• 5 pages per month</p>
                  <p>• 6 blog posts</p>
                  <p>• 12 GBP posts</p>
                  <p>• 10 SEO improvements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Intelligence Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span>Real-time intent detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span>Automotive industry context</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span>Smart suggestion engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span>Analytics integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span>Package-aware responses</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}