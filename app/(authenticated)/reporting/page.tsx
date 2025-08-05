'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react'
import { useDealership } from '@/app/context/DealershipContext'
import { toast } from 'sonner'
import { DealershipSelector } from '@/components/layout/dealership-selector'



export default function ReportingPage() {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('30days')

  const { currentDealership } = useDealership()

  const handleRefresh = () => {
    setLoading(true)
    // Simulate refresh
    setTimeout(() => {
      setLoading(false)
      toast.success("Analytics insights refreshed")
    }, 1000)
  }

  const handleExport = async () => {
    try {
      const dealershipId = currentDealership?.id || localStorage.getItem('selectedDealershipId')
      const params = new URLSearchParams({
        dateRange,
        ...(dealershipId && { dealershipId })
      })

      const response = await fetch(`/api/reporting/export-csv?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export insights')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `seo-insights-${dateRange}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success("SEO insights exported successfully")
    } catch (error) {
      console.error('Export error:', error)
      toast.error("Failed to export insights")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-white to-blue-50/30 rounded-lg border border-slate-200 p-8 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100/50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-700" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900">SEO Analytics</h1>
              </div>
              <p className="text-slate-600 text-base">
                Performance insights and actionable data analysis
              </p>
            </div>
            <div className="mt-6 lg:mt-0 flex items-center gap-3">
              <DealershipSelector />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="thisYear">This year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="border-slate-300 hover:bg-slate-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* User Behavior Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">User Behavior</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100">
                  <div className="text-2xl font-medium text-emerald-700 mb-1">65% / 35%</div>
                  <div className="text-sm text-slate-700">New vs Returning</div>
                  <div className="text-xs text-slate-500 mt-1">User acquisition</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100">
                  <div className="text-2xl font-medium text-blue-700 mb-1">2:45</div>
                  <div className="text-sm text-slate-700">Avg. Session</div>
                  <div className="text-xs text-slate-500 mt-1">Minutes per visit</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50/50 rounded-lg border border-purple-100">
                  <div className="text-2xl font-medium text-purple-700 mb-1">3.2</div>
                  <div className="text-sm text-slate-700">Pages/Session</div>
                  <div className="text-xs text-slate-500 mt-1">Content depth</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-lg border border-orange-100">
                  <div className="text-2xl font-medium text-orange-700 mb-1">68%</div>
                  <div className="text-sm text-slate-700">Engagement Rate</div>
                  <div className="text-xs text-slate-500 mt-1">Quality visits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50/50 rounded-lg border border-green-100">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Organic Search</div>
                    <div className="text-xs text-slate-500">SEO performance</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-medium text-green-700">45%</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-sky-50 to-blue-50/50 rounded-lg border border-sky-100">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Direct</div>
                    <div className="text-xs text-slate-500">Brand recognition</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-medium text-sky-700">25%</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-pink-50 to-rose-50/50 rounded-lg border border-pink-100">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Social Media</div>
                    <div className="text-xs text-slate-500">Social engagement</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-medium text-pink-700">15%</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50 to-yellow-50/50 rounded-lg border border-amber-100">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Referral</div>
                    <div className="text-xs text-slate-500">External links</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-medium text-amber-700">15%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic & Device Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">Geographic Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Top Cities</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Columbus, OH</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: '45%'}}></div>
                        </div>
                        <span className="text-sm text-slate-600 w-8 text-right">45%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Dublin, OH</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: '20%'}}></div>
                        </div>
                        <span className="text-sm text-slate-600 w-8 text-right">20%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Westerville, OH</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: '15%'}}></div>
                        </div>
                        <span className="text-sm text-slate-600 w-8 text-right">15%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Delaware, OH</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: '12%'}}></div>
                        </div>
                        <span className="text-sm text-slate-600 w-8 text-right">12%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Device Usage</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-purple-50/50 rounded-lg border border-violet-100">
                      <div className="text-xl font-medium text-violet-700">60%</div>
                      <div className="text-xs text-slate-500 mt-1">Desktop</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-fuchsia-50 to-pink-50/50 rounded-lg border border-fuchsia-100">
                      <div className="text-xl font-medium text-fuchsia-700">35%</div>
                      <div className="text-xs text-slate-500 mt-1">Mobile</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-lg border border-rose-100">
                      <div className="text-xl font-medium text-rose-700">5%</div>
                      <div className="text-xs text-slate-500 mt-1">Tablet</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">User Journey Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Peak Activity Times</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">9:00 - 11:00 AM</span>
                      <span className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded">Peak Hours</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">2:00 - 4:00 PM</span>
                      <span className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded">High Activity</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Tuesday - Thursday</span>
                      <span className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded">Best Days</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Top Landing Pages</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Homepage</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">2,450 visits</span>
                        <span className="text-sm font-medium text-slate-900">35%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">New Vehicles</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">1,680 visits</span>
                        <span className="text-sm font-medium text-slate-900">24%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Service Center</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">1,120 visits</span>
                        <span className="text-sm font-medium text-slate-900">16%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-900">Used Cars</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">980 visits</span>
                        <span className="text-sm font-medium text-slate-900">14%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEO Insights & Opportunities */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="border border-slate-200/60 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900">SEO Insights & Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">High Opportunity Keywords</h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100 border-l-4 border-l-emerald-500">
                      <p className="text-sm font-medium text-slate-900">acura financing</p>
                      <p className="text-xs text-slate-600 mt-1">Position 12 • High impressions, low clicks</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100 border-l-4 border-l-emerald-500">
                      <p className="text-sm font-medium text-slate-900">acura lease deals</p>
                      <p className="text-xs text-slate-600 mt-1">Position 15 • Growing search volume</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-lg border border-emerald-100 border-l-4 border-l-emerald-500">
                      <p className="text-sm font-medium text-slate-900">acura service specials</p>
                      <p className="text-xs text-slate-600 mt-1">Position 18 • Low competition</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Trending Up</h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100 border-l-4 border-l-blue-500">
                      <p className="text-sm font-medium text-slate-900">2024 acura mdx</p>
                      <p className="text-xs text-slate-600 mt-1">+25% impressions this month</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100 border-l-4 border-l-blue-500">
                      <p className="text-sm font-medium text-slate-900">acura hybrid models</p>
                      <p className="text-xs text-slate-600 mt-1">+18% search interest</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100 border-l-4 border-l-blue-500">
                      <p className="text-sm font-medium text-slate-900">acura warranty</p>
                      <p className="text-xs text-slate-600 mt-1">+12% click-through rate</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Needs Attention</h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-lg border border-amber-100 border-l-4 border-l-amber-500">
                      <p className="text-sm font-medium text-slate-900">acura parts</p>
                      <p className="text-xs text-slate-600 mt-1">High impressions, low CTR (1.2%)</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-lg border border-amber-100 border-l-4 border-l-amber-500">
                      <p className="text-sm font-medium text-slate-900">used acura</p>
                      <p className="text-xs text-slate-600 mt-1">Declining position (was 8, now 12)</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-lg border border-amber-100 border-l-4 border-l-amber-500">
                      <p className="text-sm font-medium text-slate-900">acura maintenance</p>
                      <p className="text-xs text-slate-600 mt-1">Missing featured snippet opportunity</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}