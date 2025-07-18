import { NextRequest, NextResponse } from 'next/server';
import { SimpleAuth } from '@/lib/auth-simple';

export async function GET(request: NextRequest) {
  console.log('🧪 TEST-AUTH: Starting authentication test...');
  
  // Test 1: Check cookie presence
  const cookieValue = request.cookies.get('seo-hub-session')?.value;
  console.log('🍪 TEST-AUTH: Cookie present:', !!cookieValue, 'length:', cookieValue?.length || 0);
  
  // Test 2: Get session from request
  const session = await SimpleAuth.getSessionFromRequest(request);
  console.log('📋 TEST-AUTH: Session result:', {
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
    role: session?.user?.role
  });
  
  // Test 3: Get session from server (should fail in API route)
  let serverSession;
  try {
    serverSession = await SimpleAuth.getSession();
    console.log('🖥️ TEST-AUTH: Server session:', !!serverSession);
  } catch (e) {
    console.log('🖥️ TEST-AUTH: Server session failed (expected in API route):', e);
  }
  
  return NextResponse.json({
    cookie: {
      present: !!cookieValue,
      length: cookieValue?.length || 0
    },
    requestSession: session ? {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role
    } : null,
    serverSession: serverSession ? {
      userId: serverSession.user.id,
      email: serverSession.user.email,
      role: serverSession.user.role
    } : null
  });
}