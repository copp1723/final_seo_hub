import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debug auto-login endpoint')
    
    // Find the super admin user
    const superAdmin = await prisma.users.findFirst({
      where: { 
        email: 'josh.copp@onekeel.ai',
        role: 'SUPER_ADMIN'
      }
    })

    if (!superAdmin) {
      return NextResponse.json(
        { error: 'Super admin user not found' },
        { status: 404 }
      )
    }

    // Create session for the super admin user
    const sessionToken = await SimpleAuth.createSession({
      id: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
      agencyId: superAdmin.agencyId,
      dealershipId: superAdmin.dealershipId,
      name: superAdmin.name
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

    console.log('✅ Auto-login session created for user:', superAdmin.id)
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
