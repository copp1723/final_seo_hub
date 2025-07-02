import { NextResponse } from 'next/server'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  const now = new Date()
  
  // Calculate date ranges
  const last30Days = {
    startDate: format(subDays(now, 30), 'yyyy-MM-dd'),
    endDate: format(now, 'yyyy-MM-dd')
  }
  
  const thisMonth = {
    startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(now), 'yyyy-MM-dd')
  }

  return NextResponse.json({
    serverTime: now.toISOString(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    formattedDate: format(now, 'MMMM d, yyyy'),
    formattedDateTime: format(now, 'MMMM d, yyyy HH:mm:ss'),
    dateRanges: {
      last30Days,
      thisMonth
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TZ: process.env.TZ
    }
  })
} 