import { NextRequest, NextResponse } from 'next/server'
import { apiMonitor } from './api-monitor'
import { auth } from './auth'

export function withApiMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const startTime = Date.now()
    let response: NextResponse
    let userId: string | undefined
    
    try {
      // Get user ID for logging context
      const session = await auth()
      userId = session?.user?.id
      
      response = await handler(req)
    } catch (error) {
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    
    const responseTime = Date.now() - startTime
    
    // Log the API call
    apiMonitor.logRequest({
      path: req.nextUrl.pathname,
      method: req.method,
      statusCode: response.status,
      responseTime,
      userId,
      userAgent: req.headers.get('user-agent') || undefined
    })
    
    return response
  }
}