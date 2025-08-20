#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { decrypt, encrypt } = require('../lib/encryption')
const { google } = require('googleapis')

const prisma = new PrismaClient()

async function refreshExpiredTokens() {
  try {
    console.log('🔄 Starting manual token refresh for expired connections...')
    
    const userId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
    const dealershipId = 'dealer-acura-columbus'

    // Check both GA4 and Search Console connections
    const [ga4Connection, scConnection] = await Promise.all([
      prisma.ga4_connections.findFirst({
        where: {
          dealershipId: dealershipId,
          userId: userId
        }
      }),
      prisma.search_console_connections.findFirst({
        where: {
          dealershipId: dealershipId,
          userId: userId
        }
      })
    ])

    console.log('🔍 Checking GA4 connection:')
    if (!ga4Connection) {
      console.log('❌ No GA4 connection found')
    } else {
      console.log('✅ GA4 connection found:', {
        id: ga4Connection.id,
        propertyId: ga4Connection.propertyId,
        expiresAt: ga4Connection.expiresAt?.toISOString(),
        hasRefreshToken: !!ga4Connection.refreshToken
      })

      if (ga4Connection.refreshToken) {
        try {
          const refreshToken = decrypt(ga4Connection.refreshToken)
          console.log('GA4 Refresh token:', refreshToken.length > 50 ? `${refreshToken.substring(0, 20)}...` : refreshToken)
        } catch (error) {
          console.log('❌ Failed to decrypt GA4 refresh token:', error.message)
        }
      }
    }

    console.log('\n🔍 Checking Search Console connection:')
    if (!scConnection) {
      console.log('❌ No Search Console connection found')
    } else {
      console.log('✅ Search Console connection found:', {
        id: scConnection.id,
        siteUrl: scConnection.siteUrl,
        expiresAt: scConnection.expiresAt?.toISOString(),
        hasRefreshToken: !!scConnection.refreshToken
      })

      if (scConnection.refreshToken) {
        try {
          const refreshToken = decrypt(scConnection.refreshToken)
          console.log('Search Console Refresh token:', refreshToken.length > 50 ? `${refreshToken.substring(0, 20)}...` : refreshToken)
        } catch (error) {
          console.log('❌ Failed to decrypt Search Console refresh token:', error.message)
        }
      }
    }

    const connection = ga4Connection

    if (!connection) {
      console.log('❌ No connection found')
      return
    }

    console.log('🔍 Found connection:', {
      id: connection.id,
      propertyId: connection.propertyId,
      expiresAt: connection.expiresAt?.toISOString(),
      hasRefreshToken: !!connection.refreshToken
    })

    if (!connection.refreshToken) {
      console.log('❌ No refresh token available - connection needs to be re-authorized')
      return
    }

    // Try to decrypt and inspect the refresh token
    let refreshToken
    try {
      refreshToken = decrypt(connection.refreshToken)
      console.log('✅ Refresh token decrypted successfully, length:', refreshToken.length)
      
      if (refreshToken.length < 50) {
        console.log('⚠️ Refresh token is suspiciously short, might be invalid:', refreshToken)
        return
      }
    } catch (error) {
      console.log('❌ Failed to decrypt refresh token:', error.message)
      return
    }

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    })

    console.log('🔄 Attempting to refresh token...')

    // Try to refresh
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        console.log('❌ No access token received from refresh')
        return
      }

      console.log('✅ Token refreshed successfully!')
      console.log('New token info:', {
        hasAccessToken: !!credentials.access_token,
        accessTokenLength: credentials.access_token?.length,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown'
      })

      // Update the connection
      const newExpiresAt = credentials.expiry_date 
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 60 * 60 * 1000) // Default to 1 hour

      await prisma.ga4_connections.update({
        where: { id: connection.id },
        data: {
          accessToken: encrypt(credentials.access_token),
          refreshToken: credentials.refresh_token ? encrypt(credentials.refresh_token) : connection.refreshToken,
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        }
      })

      console.log('✅ Connection updated in database')
      
    } catch (refreshError) {
      console.log('❌ Token refresh failed:', refreshError.message)
      
      if (refreshError.message.includes('invalid_grant')) {
        console.log('💡 Refresh token has expired or been revoked. User needs to re-authorize.')
      }
    }

  } catch (error) {
    console.error('❌ Error during token refresh:', error)
  } finally {
    await prisma.$disconnect()
  }
}

refreshExpiredTokens()