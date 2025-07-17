import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request);

    if (!session?.user.id) {
      return NextResponse.json({
        authenticated: false,
        user: null
      }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null
    }, { status: 401 });
  }
}