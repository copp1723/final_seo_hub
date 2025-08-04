import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return empty activity for alpha launch
    return NextResponse.json({
      success: true,
      data: {
        activities: [],
        message: "Alpha launch - activity tracking coming soon"
      }
    })

  } catch (error) {
    console.error('Recent activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}