import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { features } from '@/app/lib/features'
import { getDemoActivity } from '@/lib/demo-data'

// Force dynamic rendering since we use auth
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return demo data if demo mode is enabled
    if (features.demoMode) {
      console.log('🎭 Dashboard Recent Activity: Returning demo data')
      return NextResponse.json({ 
        success: true,
        data: getDemoActivity()
      })
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