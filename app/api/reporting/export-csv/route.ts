import { NextRequest, NextResponse } from 'next/server'

// Helper to convert analytics data to CSV
function analyticsToCSV(data: any): string {
  const rows = [
    ['Metric', 'Value'],
    ['Total Sessions', data?.ga4Data?.sessions ?? 'N/A'],
    ['Unique Users', data?.ga4Data?.users ?? 'N/A'],
    ['Organic Clicks', data?.searchConsoleData?.clicks ?? 'N/A'],
    ['Impressions', data?.searchConsoleData?.impressions ?? 'N/A'],
    ['Event Count', data?.ga4Data?.eventCount ?? 'N/A'],
    ['Bounce Rate', data?.ga4Data?.bounceRate ?? 'N/A'],
    ['CTR', data?.searchConsoleData?.ctr ?? 'N/A'],
    ['Avg Position', data?.searchConsoleData?.position ?? 'N/A'],
  ]
  return rows.map(row => row.join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  // Forward query params to analytics API
  const url = new URL(req.url)
  const params = url.searchParams.toString()
  const analyticsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/dashboard/analytics?${params}`, {
    headers: { Cookie: req.headers.get('cookie') || '' },
    credentials: 'include',
    cache: 'no-store',
  })
  if (!analyticsRes.ok) {
    return new NextResponse('Failed to fetch analytics', { status: 500 })
  }
  const result = await analyticsRes.json()
  const csv = analyticsToCSV(result.data)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="report.csv"',
    },
  })
}
