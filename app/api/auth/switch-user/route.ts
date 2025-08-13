import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').trim().toLowerCase()

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email parameter' }, { status: 400 })
    }

    const session = await SimpleAuth.getSessionFromRequest(request)
    if (session?.user.email === email) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const response = NextResponse.redirect(new URL(`/auth/simple-signin?email=${encodeURIComponent(email)}&switched=1`, request.url))
    response.cookies.set(SimpleAuth.COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    logger.info('Account switch initiated', { from: session?.user.email, to: email })
    return response
  } catch (error) {
    logger.error('Switch user error', error)
    return NextResponse.redirect(new URL('/auth/error?error=Configuration', request.url))
  }
}
