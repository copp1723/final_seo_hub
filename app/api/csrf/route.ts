import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOrCreateCSRFToken } from '@/lib/csrf'

export async function GET(request: NextRequest) {
  const session = await auth()
  
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
