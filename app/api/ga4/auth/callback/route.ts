import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the userId
    const error = searchParams.get('error')

    logger.info('GA4 OAuth callback received', { code: !!code, state, error })

    if (error) {
      logger.error('GA4 OAuth error from Google', { error })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=error&service=ga4&error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      logger.error('GA4 OAuth missing parameters', { hasCode: !!code, hasState: !!state })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=error&service=ga4&error=Missing authorization code`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    )

    logger.info('Exchanging code for tokens', { hasClientId: !!process.env.GOOGLE_CLIENT_ID })
    const { tokens } = await oauth2Client.getToken(code)
    logger.info('Tokens received', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token })
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Set credentials and use default property (skip API calls that require additional permissions)
    oauth2Client.setCredentials(tokens)
    
    let propertyId = '320759942' // Default to Jay Hatfield Chevrolet
    let propertyName = 'Jay Hatfield Chevrolet'
    
    logger.info('Using default GA4 property', { propertyId, propertyName })

    // Get user's dealership for proper connection
    const user = await prisma.users.findUnique({
      where: { id: state },
      include: { dealerships: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const dealershipId = user.dealerships?.id || null
    logger.info('Creating GA4 connection', { userId: state, dealershipId, propertyId })

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    // Use upsert to update existing connection or create new one
    const connection = await prisma.ga4_connections.upsert({
      where: { userId: state },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        propertyId,
        propertyName,
        updatedAt: new Date()
      },
      create: {
        userId: state,
        dealershipId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        propertyId,
        propertyName
      }
    })

    logger.info('GA4 connection updated successfully', {
      userId: state,
      connectionId: connection.id,
      propertyId: connection.propertyId,
      propertyName: connection.propertyName
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=success&service=ga4`)

  } catch (error) {
    logger.error('GA4 OAuth callback error', error, {
      code: searchParams?.get('code') ? 'present' : 'missing',
      state: searchParams?.get('state'),
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    })
    const errorMessage = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?status=error&service=ga4&error=${encodeURIComponent(errorMessage)}`)
  }
}
