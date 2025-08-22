import { SimpleSession } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { getSearchConsoleService } from '@/lib/google/searchConsoleService'
import { google } from 'googleapis'
import { encrypt, decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

export interface SearchConsoleConnection {
  id: string
  userId: string
  dealershipId: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  siteUrl: string | null
  siteName: string | null
}

export class SearchConsoleAPI {
  static async getConnection(userId: string, dealershipId?: string | null): Promise<SearchConsoleConnection | null> {
    return await prisma.search_console_connections.findFirst({
      where: { 
        userId,
        dealershipId: dealershipId === undefined ? undefined : dealershipId
      }
    })
  }

  static async createOrUpdateConnection(
    userId: string,
    tokens: any,
    siteInfo: { siteUrl: string; siteName: string },
    dealershipId?: string | null
  ) {
    // Find existing connection first
    const existing = await prisma.search_console_connections.findFirst({
      where: { userId, dealershipId: dealershipId || null }
    })
    
    if (existing) {
      // Update existing connection
      return await prisma.search_console_connections.update({
        where: { id: existing.id },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          siteUrl: siteInfo.siteUrl,
          siteName: siteInfo.siteName,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new connection
      return await prisma.search_console_connections.create({
        data: {
          userId,
          dealershipId: dealershipId || null,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          siteUrl: siteInfo.siteUrl,
          siteName: siteInfo.siteName
          ,
          updatedAt: new Date()
        }
      })
    }
  }

  static async deleteConnection(userId: string, dealershipId?: string | null) {
    await prisma.search_console_connections.deleteMany({
      where: { 
        userId,
        dealershipId: dealershipId === undefined ? undefined : dealershipId
      }
    })
  }

  static async getService(userId: string, dealershipId?: string | null) {
    const connection = await this.getConnection(userId, dealershipId)
    
    if (!connection || !connection.accessToken) {
      throw new Error('No Search Console connection found')
    }

    try {
      return await getSearchConsoleService(userId)
    } catch (error) {
      logger.error('Failed to initialize Search Console service', error)
      
      // Check if token is expired
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('invalid_grant'))) {
        throw new Error('Search Console token expired. Please reconnect.')
      }
      
      throw error
    }
  }

  static getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/search-console/callback`
    )
  }

  static async listSites(userId: string, dealershipId?: string | null) {
    const connection = await this.getConnection(userId, dealershipId)
    
    if (!connection || !connection.accessToken) {
      return {
        success: false,
        sites: [],
        message: 'No Search Console connection found. Please connect your Google Search Console account.',
        needsConnection: true
      }
    }

    try {
      const oauth2Client = this.getOAuth2Client()
      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client
      })
      
      const sitesResponse = await searchConsole.sites.list()
      const allSites = sitesResponse.data.siteEntry || []
      
      const processedSites = allSites.map(site => ({
        siteUrl: site.siteUrl,
        siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
        permissionLevel: site.permissionLevel,
        hasFullAccess: site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser',
        hasRestrictedAccess: site.permissionLevel === 'siteRestrictedUser',
        canUseApi: site.permissionLevel !== 'siteUnverifiedUser'
      }))

      // Sort by permission level
      processedSites.sort((a, b) => {
        if (a.hasFullAccess && !b.hasFullAccess) return -1
        if (!a.hasFullAccess && b.hasFullAccess) return 1
        return 0
      })

      return {
        success: true,
        sites: processedSites,
        currentSiteUrl: connection.siteUrl,
        currentSiteName: connection.siteName,
        totalSites: allSites.length,
        fullAccessSites: processedSites.filter(s => s.hasFullAccess).length
      }
    } catch (error) {
      logger.error('Failed to list Search Console sites', error)
      
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('invalid_grant'))) {
        return {
          success: false,
          sites: [],
          message: 'Your Search Console connection has expired. Please reconnect.',
          needsReconnection: true
        }
      }

      return {
        success: false,
        sites: [],
        message: 'Failed to fetch Search Console sites. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
