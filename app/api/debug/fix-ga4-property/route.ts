import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current GA4 connection
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        propertyId: true,
        propertyName: true,
        expiresAt: true
      }
    })

    if (!connection) {
      return NextResponse.json({
        status: 'no_connection',
        message: 'No GA4 connection found'
      })
    }

    const diagnostics: any = {
      hasConnection: true,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName,
      tokenExpired: connection.expiresAt ? new Date() > connection.expiresAt : false,
      propertyIdValid: connection.propertyId ? /^\d+$/.test(connection.propertyId) : false,
      needsFix: false
    }

    // Check if property ID needs fixing
    if (connection.propertyId) {
      if (connection.propertyId.startsWith('properties/')) {
        diagnostics.needsFix = true
        diagnostics.originalPropertyId = connection.propertyId
        diagnostics.correctedPropertyId = connection.propertyId.split('/').pop()
      } else if (!/^\d+$/.test(connection.propertyId)) {
        diagnostics.needsFix = true
        diagnostics.issue = 'Invalid property ID format'
      }
    }

    return NextResponse.json({
      status: 'ok',
      diagnostics,
      recommendations: diagnostics.needsFix 
        ? ['Property ID needs to be fixed', 'Call POST to this endpoint to fix automatically']
        : ['GA4 connection appears to be properly configured']
    })

  } catch (error) {
    logger.error('GA4 diagnostic error', error)
    return NextResponse.json(
      { error: 'Diagnostic check failed' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current GA4 connection
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    })

    if (!connection) {
      return NextResponse.json({
        status: 'no_connection',
        message: 'No GA4 connection found to fix'
      })
    }

    let fixed = false
    let changes = {}

    // Fix property ID if needed
    if (connection.propertyId && connection.propertyId.startsWith('properties/')) {
      const correctedId = connection.propertyId.split('/').pop()
      
      if (correctedId && /^\d+$/.test(correctedId)) {
        await prisma.gA4Connection.update({
          where: { id: connection.id },
          data: { 
            propertyId: correctedId,
            updatedAt: new Date()
          }
        })
        
        changes = {
          before: connection.propertyId,
          after: correctedId
        }
        fixed = true
        
        logger.info('Fixed GA4 property ID', {
          userId: session.user.id,
          before: connection.propertyId,
          after: correctedId
        })
      }
    }

    return NextResponse.json({
      status: fixed ? 'fixed' : 'no_fix_needed',
      changes,
      message: fixed 
        ? 'Property ID has been corrected. You can now try accessing GA4 analytics again.'
        : 'No fixes were needed for your GA4 connection.'
    })

  } catch (error) {
    logger.error('GA4 fix error', error)
    return NextResponse.json(
      { error: 'Fix operation failed' },
      { status: 500 }
    )
  }
} 