import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

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

    return response;
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json({ error: 'Signout failed' }, { status: 500 });
  }
}