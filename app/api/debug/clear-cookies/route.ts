import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧹 Clearing all cookies for testing')
  
  const response = NextResponse.json({ 
    message: 'Cookies cleared. Refresh the page to get new auto-login session.',
    timestamp: new Date().toISOString()
  })
  
  // Clear the session cookie
  response.cookies.set('seo-hub-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  // Clear any other auth-related cookies
  response.cookies.set('next-auth.session-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  response.cookies.set('__Secure-next-auth.session-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  return response
}
