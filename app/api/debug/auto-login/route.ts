import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debug auto-login endpoint')
    
    // Create session for the super admin user
    const sessionToken = await SimpleAuth.createSession({
      id: '3e50bcc8-cd3e-4773-a790-e0570de37371',
      email: 'josh.copp@onekeel.ai',
      role: 'SUPER_ADMIN',
      agencyId: null,
      dealershipId: null,
      name: 'Josh Copp'
    })

    // Create response with session cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    
    response.cookies.set(SimpleAuth.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    console.log('✅ Auto-login session created and cookie set')
    return response
    
  } catch (error) {
    console.error('❌ Auto-login failed:', error)
    return NextResponse.json(
      { 
        error: 'Auto-login failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
