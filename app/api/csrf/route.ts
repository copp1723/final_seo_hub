import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getOrCreateCSRFToken } from '@/lib/csrf'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated) return authResult.response
  const session = { user: authResult.user }
  
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
