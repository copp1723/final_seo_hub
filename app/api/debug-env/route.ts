import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Only allow this in development or for debugging
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      // Don't expose sensitive vars, just check if they exist
      DATABASE_URL: process.env.DATABASE_URL ? '***SET***' : 'NOT_SET',
      requestUrl: request.url,
      requestHost: request.headers.get('host'),
      requestProtocol: request.headers.get('x-forwarded-proto') || 'http'
    }

    return NextResponse.json(envInfo)
  } catch (error) {
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}