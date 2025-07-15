'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  MousePointerClick,
  Percent,
  Hash,
  TrendingUp,
  AlertCircle,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { 
  loading: () => <Loader2 className="h-6 w-6 animate-spin" />,
  ssr: false 
})

interface SearchTabProps {
  scData: any
  scError: string | null
  chartOptions: any
}

export default function SearchTab({ scData, scError, chartOptions }: SearchTabProps) {
  const [sortField, setSortField] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: 'clicks' | 'impressions' | 'ctr' | 'position') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  const sortedQueries = scData?.topQueries ? [...scData.topQueries].sort((a: any, b: any) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
  }) : []
  if (scError) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to load search data</h3>
        <p className="text-gray-600 mb-4">{scError}</p>
        {scError.includes('not connected') && (
          <button 
            onClick={() => window.location.href = '/api/search-console/connect'}
            className="text-blue-600 hover:underline"
          >
            Connect Search Console
          </button>
        )}
      </Card>
    )
  }

  // Safely format dates with validation
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid'
    return format(date, 'MMM d')
  }

  const performanceChartData = {
    labels: scData?.performanceByDate.dates?.map((date: string) => formatDate(date)).filter((label: string) => label !== 'Invalid') || [],
    datasets: [
      {
        label: 'Clicks',
        data: scData?.performanceByDate.metrics.clicks || [],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Impressions (÷100)',
        data: scData?.performanceByDate.metrics.impressions.map((v: number) => v / 100) || [],
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        fill: false,
        tension: 0.4,
        borderDash: [5, 5],
        yAxisID: 'y'
      }
    ]
  }

  const ctrChartData = {
    labels: scData?.performanceByDate.dates?.map((date: string) => formatDate(date)).filter((label: string) => label !== 'Invalid') || [],
    datasets: [
      {
        label: 'CTR (%)',
        data: scData?.performanceByDate.metrics.ctr.map((v: number) => v * 100) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  return (
    <>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {scData?.overview?.clicks?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">From search results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {scData?.overview?.impressions?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Times shown in search</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. CTR</CardTitle>
            <Percent className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {scData?.overview?.ctr ? `${(scData.overview.ctr * 100).toFixed(1)}%` : '0%'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Click-through rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Top 10 Position</CardTitle>
            <Hash className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {scData?.top10AveragePosition?.position ? scData.top10AveragePosition.position.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Top performing queries</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Click & Impression Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line data={performanceChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Click-Through Rate Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line data={ctrChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Queries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Top Search Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Query</th>
                  <th className="text-right py-2 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('clicks')}
                      className="h-auto p-1 font-medium"
                    >
                      Clicks {getSortIcon('clicks')}
                    </Button>
                  </th>
                  <th className="text-right py-2 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('impressions')}
                      className="h-auto p-1 font-medium"
                    >
                      Impressions {getSortIcon('impressions')}
                    </Button>
                  </th>
                  <th className="text-right py-2 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('ctr')}
                      className="h-auto p-1 font-medium"
                    >
                      CTR {getSortIcon('ctr')}
                    </Button>
                  </th>
                  <th className="text-right py-2 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('position')}
                      className="h-auto p-1 font-medium"
                    >
                      Position {getSortIcon('position')}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedQueries.map((query: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 max-w-xs truncate">{query.query}</td>
                    <td className="text-right py-2 px-4">{query.clicks.toLocaleString()}</td>
                    <td className="text-right py-2 px-4">{query.impressions.toLocaleString()}</td>
                    <td className="text-right py-2 px-4">
                      <Badge variant={query.ctr * 100 > 5 ? 'default' : 'info'}>
                        {(query.ctr * 100).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-2 px-4">
                      <Badge variant={query.position <= 3 ? 'success' : query.position <= 10 ? 'default' : 'warning'}>
                        {query.position.toFixed(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Landing Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Landing Pages from Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scData?.topPages?.map((page: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {page.page.replace(/^https?:\/\/[^\/]+/, '')}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-600">
                    <span>{page.clicks.toLocaleString()} clicks</span>
                    <span>{page.impressions.toLocaleString()} impressions</span>
                    <span>CTR: {(page.ctr * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <Badge variant="default">
                  #{page.position.toFixed(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}