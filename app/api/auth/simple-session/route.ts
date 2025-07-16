import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 SESSION: Checking session...');
    const cookieValue = request.cookies.get('seo-hub-session')?.value;
    console.log('🍪 SESSION: Cookie present:', !!cookieValue, 'length:', cookieValue?.length || 0);
    
    const session = await SimpleAuth.getSessionFromRequest(request);
    console.log('🔍 SESSION: Session result:', !!session, session?.user?.email, session?.user?.role);
    
    if (!session) {
      console.log('❌ SESSION: No valid session found');
      return NextResponse.json(
        { authenticated: false, error: 'No valid session' },
        { status: 401 }
      );
    }

    console.log('✅ SESSION: Valid session found for', session.user.email);
    return NextResponse.json({
      authenticated: true,
      user: session.user,
      expires: session.expires
    });

  } catch (error) {
    console.error('❌ SESSION: Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session validation failed' },
      { status: 500 }
    );
  }
}