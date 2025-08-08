import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { getOrCreateCSRFToken } from '@/lib/csrf'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // IMPORTANT: derive session from the incoming request so cookies are read correctly
  const session = await SimpleAuth.getSessionFromRequest(request)
  
  if (!session?.user.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const token = await getOrCreateCSRFToken(session.user.id)
  
  const response = NextResponse.json({ success: true })
  response.headers.set('x-csrf-token', token)
  
  return response
}
