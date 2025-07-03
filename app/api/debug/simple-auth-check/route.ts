import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Simple auth check without complex types
  const cookies = request.cookies.getAll()
  const sessionCookie = cookies.find(c => 
    c.name.includes('session-token')
  )
  
  return NextResponse.json({
    hasSession: !!sessionCookie,
    cookieCount: cookies.length,
    sessionCookieName: sessionCookie?.name || 'none',
    environment: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    timestamp: new Date().toISOString()
  })
}