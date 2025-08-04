import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    // Clear the session cookie
    response.cookies.set(SimpleAuth.COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    // Always redirect to signin page after signout
    return NextResponse.redirect(new URL('/auth/simple-signin', request.url));
  } catch (error) {
    logger.error('Signout error:', error);
    return NextResponse.json({ message: 'Signout failed' }, { status: 500 });
  }
}