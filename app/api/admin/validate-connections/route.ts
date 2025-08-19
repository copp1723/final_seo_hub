import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { connectionIntegrityValidator } from '@/lib/services/connection-integrity-validator'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow super admins to run system-wide validation
    const { autoFix = false, userId } = await request.json()
    
    if (!userId && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Only super admins can run system-wide validation' 
      }, { status: 403 })
    }

    logger.info('🔧 Connection integrity validation requested', {
      requestedBy: session.user.id,
      autoFix,
      targetUserId: userId,
      isSystemWide: !userId
    })

    let report
    if (userId) {
      // Validate connections for specific user
      report = await connectionIntegrityValidator.validateUserConnections(userId, autoFix)
    } else {
      // Validate all connections
      report = await connectionIntegrityValidator.validateAllConnections(autoFix)
    }

    return NextResponse.json({
      success: true,
      report,
      summary: {
        total: report.totalConnections,
        valid: report.validConnections,
        invalid: report.invalidConnections,
        cleaned: report.cleanedUpConnections,
        issuesFound: report.issues.length
      }
    })

  } catch (error) {
    logger.error('Connection validation API error', error)
    return NextResponse.json(
      { error: 'Failed to validate connections' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Users can check their own connections, admins can check any
    if (userId && userId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Access denied to other user connections' 
      }, { status: 403 })
    }

    const targetUserId = userId || session.user.id
    const report = await connectionIntegrityValidator.validateUserConnections(targetUserId, false)

    return NextResponse.json({
      success: true,
      report,
      summary: {
        total: report.totalConnections,
        valid: report.validConnections,
        invalid: report.invalidConnections,
        issuesFound: report.issues.length
      }
    })

  } catch (error) {
    logger.error('Connection validation check API error', error)
    return NextResponse.json(
      { error: 'Failed to check connections' },
      { status: 500 }
    )
  }
}