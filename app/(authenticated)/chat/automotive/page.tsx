import { AutomotiveSEOChat } from '@/components/chat/automotive-seo-chat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Car, TrendingUp, Target } from 'lucide-react'

export default function AutomotiveChatPage() {
  // In production, this would come from user session/database
  const dealershipInfo = {
    brand: 'Toyota',
    location: 'Dallas, TX',
    inventorySize: 450,
    currentPackage: 'gold' as const
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Automotive SEO Expert Assistant</h1>
        <p className="text-gray-600">
          Advanced AI-powered SEO consultation specifically designed for automotive dealerships
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>SEO Consultation</CardTitle>
              <CardDescription>
                Get expert advice on inventory optimization, local rankings, and lead generation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
              <CardTitle className="text-lg">Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Dealership:</span>
                  <Badge variant="outline">{dealershipInfo.brand}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Location:</span>
                  <span className="text-sm font-medium">{dealershipInfo.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inventory:</span>
                  <span className="text-sm font-medium">{dealershipInfo.inventorySize} vehicles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">SEO Package:</span>
                  <Badge className="capitalize bg-yellow-100 text-yellow-800">
                    {dealershipInfo.currentPackage}
                  </Badge>
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