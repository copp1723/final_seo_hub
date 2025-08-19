import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const switchDealershipSchema = z.object({
  dealershipId: z.string().min(1, 'Dealership ID is required')
})

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = switchDealershipSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { dealershipId } = validation.data

    // Use the auth method to switch dealership (includes access validation)
    const success = await SimpleAuth.switchDealership(session.user.id, dealershipId)

    if (!success) {
      return NextResponse.json({ 
        error: 'Unable to switch to dealership. You may not have access or the dealership may not exist.' 
      }, { status: 403 })
    }

    // Get enhanced session to return updated dealership context
    const enhancedSession = await SimpleAuth.getEnhancedSession(request)

    logger.info('User switched dealership context', {
      userId: session.user.id,
      userEmail: session.user.email,
      newDealershipId: dealershipId,
      previousDealershipId: session.user.currentDealershipId
    })

    return NextResponse.json({
      message: 'Dealership context switched successfully',
      currentDealershipId: dealershipId,
      dealershipAccess: enhancedSession?.dealershipAccess || null
    })

  } catch (error) {
    logger.error('Error switching dealership context', {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { error: 'Failed to switch dealership context' },
      { status: 500 }
    )
  }
}

// GET - Get current dealership context and available dealerships
export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enhancedSession = await SimpleAuth.getEnhancedSession(request)

    if (!enhancedSession) {
      return NextResponse.json({ error: 'Unable to retrieve dealership context' }, { status: 500 })
    }

    return NextResponse.json({
      currentDealershipId: enhancedSession.dealershipAccess.current,
      availableDealerships: enhancedSession.dealershipAccess.available,
      user: {
        id: enhancedSession.user.id,
        email: enhancedSession.user.email,
        role: enhancedSession.user.role
      }
    })

  } catch (error) {
    logger.error('Error retrieving dealership context', {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { error: 'Failed to retrieve dealership context' },
      { status: 500 }
    )
  }
}