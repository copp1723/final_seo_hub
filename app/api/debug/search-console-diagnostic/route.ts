import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { google } from 'googleapis'
import { logger } from '@/lib/logger'


// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

    const diagnostic = {
      timestamp: new Date().toISOString(),
      userId: authResult.user!.id,
      environmentChecks: {} as any,
      databaseChecks: {} as any,
      tokenChecks: {} as any,
      apiChecks: {} as any
    }

    // Environment variable checks
    diagnostic.environmentChecks = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      encryptionKeyLength: process.env.ENCRYPTION_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV
    }

    // Database connection check
    try {
      await prisma.$connect()
      diagnostic.databaseChecks.connection = 'success'

      // Get user's dealership
      const user = await prisma.users.findUnique({
        where: { id: authResult.user!.id },
        include: { dealerships: true }
      })

      if (!user?.dealerships?.id) {
        diagnostic.databaseChecks.noDealership = true
        return NextResponse.json(diagnostic, { status: 200 })
      }

      diagnostic.databaseChecks.dealershipId = user.dealerships.id
      
      // Check if searchConsoleConnection record exists
      const connection = await prisma.search_console_connections.findUnique({
        where: { userId: user.dealerships?.id }
      })
      
      diagnostic.databaseChecks.recordExists = !!connection
      
      if (connection) {
        diagnostic.databaseChecks.recordDetails = {
          hasAccessToken: !!connection.accessToken,
          hasRefreshToken: !!connection.refreshToken,
          hasSiteUrl: !!connection.siteUrl,
          expiresAt: connection.expiresAt?.toISOString(),
          createdAt: connection.createdAt.toISOString(),
          updatedAt: connection.updatedAt.toISOString()
        }

        // Token decryption check
        try {
          console.log('DEBUG: connection.accessToken type:', typeof connection.accessToken, 'value:', connection.accessToken)
          if (!connection.accessToken) {
            throw new Error('Access token is null or undefined')
          }
          const accessToken = decrypt(connection.accessToken)
          diagnostic.tokenChecks.accessTokenDecryption = 'success'
          diagnostic.tokenChecks.accessTokenLength = accessToken.length
          diagnostic.tokenChecks.accessTokenStartsWith = accessToken.substring(0, 10) + '...'
          
          if (connection.refreshToken) {
            const refreshToken = decrypt(connection.refreshToken)
            diagnostic.tokenChecks.refreshTokenDecryption = 'success'
            diagnostic.tokenChecks.refreshTokenLength = refreshToken.length
            diagnostic.tokenChecks.refreshTokenStartsWith = refreshToken.substring(0, 10) + '...'
          }
        } catch (error) {
          diagnostic.tokenChecks.decryptionError = error instanceof Error ? error.message : 'Unknown error'
        }

        // Google API test
        try {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXTAUTH_URL}/api/search-console/callback`
          )

          console.log('DEBUG: connection.accessToken for API test:', typeof connection.accessToken, 'value:', connection.accessToken)
          if (!connection.accessToken) {
            throw new Error('Access token is null or undefined for API test')
          }
          const accessToken = decrypt(connection.accessToken)
          const refreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined

          oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          const searchConsole = google.searchconsole({
            version: 'v1',
            auth: oauth2Client
          })

          // Test API call - list sites
          const sitesResponse = await searchConsole.sites.list()
          diagnostic.apiChecks.sitesListCall = 'success'
          diagnostic.apiChecks.sitesCount = sitesResponse.data.siteEntry?.length || 0
          diagnostic.apiChecks.sites = sitesResponse.data.siteEntry?.map(site => site.siteUrl) || []

          // Test performance API call with minimal parameters
          if (connection.siteUrl) {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - 7) // Last 7 days

            const performanceResponse = await searchConsole.searchanalytics.query({
              siteUrl: connection.siteUrl,
              requestBody: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                dimensions: [],
                searchType: 'web',
                rowLimit: 1
              }
            })
            
            diagnostic.apiChecks.performanceCall = 'success'
            diagnostic.apiChecks.performanceData = performanceResponse.data
          }

        } catch (error) {
          diagnostic.apiChecks.error = error instanceof Error ? error.message : 'Unknown error'
          diagnostic.apiChecks.errorStack = error instanceof Error ? error.stack : undefined
        }
      }
      
    } catch (error) {
      diagnostic.databaseChecks.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(diagnostic, { status: 200 })

  } catch (error) {
    logger.error('Search Console diagnostic error', error)
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
