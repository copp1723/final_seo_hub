import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return no emergency status for alpha launch
    return NextResponse.json({
      success: true,
      data: {
        hasEmergency: false,
        message: "All systems operational"
      }
    })

  } catch (error) {
    console.error('Emergency check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}