import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [ga4Token, scToken] = await Promise.all([
      prisma.user_ga4_tokens.findUnique({
        where: { userId: session.user.id }
      }),
      prisma.user_search_console_tokens.findUnique({
        where: { userId: session.user.id }
      })
    ])

    return NextResponse.json({
      ga4: !!ga4Token,
      searchConsole: !!scToken
    })
  } catch (error) {
    return NextResponse.json({ ga4: false, searchConsole: false })
  }
}