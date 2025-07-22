import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// TEMPORARY: Set up mock tokens for testing
export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await request.json()

    if (type === 'ga4') {
      // Create mock GA4 token
      const mockAccessToken = 'mock-ga4-access-token-' + Date.now()
      const encryptedToken = await encrypt(mockAccessToken)
      
      await prisma.user_ga4_tokens.upsert({
        where: { userId: session.user.id },
        update: {
          encryptedAccessToken: encryptedToken,
          encryptedRefreshToken: encryptedToken,
          expiryDate: new Date(Date.now() + 3600000), // 1 hour
          scope: 'https://www.googleapis.com/auth/analytics.readonly',
          tokenType: 'Bearer'
        },
        create: {
          userId: session.user.id,
          encryptedAccessToken: encryptedToken,
          encryptedRefreshToken: encryptedToken,
          expiryDate: new Date(Date.now() + 3600000),
          scope: 'https://www.googleapis.com/auth/analytics.readonly',
          tokenType: 'Bearer'
        }
      })

      logger.info('Mock GA4 token created for user', { userId: session.user.id })
      return NextResponse.json({ success: true, message: 'GA4 connected (mock mode)' })
    }

    if (type === 'searchconsole') {
      // Create mock Search Console token
      const mockAccessToken = 'mock-sc-access-token-' + Date.now()
      const encryptedToken = await encrypt(mockAccessToken)
      
      // Get all dealership URLs
      const dealerships = await prisma.dealerships.findMany({
        where: {
          agencyId: session.user.agencyId || undefined
        },
        select: {
          siteUrl: true,
          primaryDomain: true
        }
      })

      const verifiedSites = dealerships
        .map(d => d.siteUrl || d.primaryDomain)
        .filter(Boolean)

      await prisma.user_search_console_tokens.upsert({
        where: { userId: session.user.id },
        update: {
          encryptedAccessToken: encryptedToken,
          encryptedRefreshToken: encryptedToken,
          expiryDate: new Date(Date.now() + 3600000),
          scope: 'https://www.googleapis.com/auth/webmasters.readonly',
          verifiedSites: verifiedSites,
          primarySite: verifiedSites[0]
        },
        create: {
          userId: session.user.id,
          encryptedAccessToken: encryptedToken,
          encryptedRefreshToken: encryptedToken,
          expiryDate: new Date(Date.now() + 3600000),
          scope: 'https://www.googleapis.com/auth/webmasters.readonly',
          verifiedSites: verifiedSites,
          primarySite: verifiedSites[0]
        }
      })

      logger.info('Mock Search Console token created for user', { userId: session.user.id })
      return NextResponse.json({ success: true, message: 'Search Console connected (mock mode)' })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    logger.error('Mock connect error', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}