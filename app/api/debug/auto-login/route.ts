import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // This endpoint has been disabled for security reasons
  return NextResponse.json(
    { 
      error: 'This debug endpoint has been disabled',
      message: 'Please use the normal login flow at /login'
    },
    { status: 403 }
  )
}