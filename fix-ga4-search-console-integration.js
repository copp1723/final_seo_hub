#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Updated GA4 List Properties API content
const GA4_LIST_PROPERTIES_CONTENT = `import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { 
        dealershipId: true, 
        role: true, 
        agencyId: true,
        email: true
      }
    })

    // Check if user has a GA4 connection
    const connection = await prisma.ga4_connections.findFirst({
      where: { userId: session.user.id }
    })

    if (!connection || !connection.accessToken) {
      return NextResponse.json({
        success: false,
        properties: [],
        message: 'No GA4 connection found. Please connect your Google Analytics account.',
        needsConnection: true
      })
    }

    try {
      // Create OAuth2 client with credentials
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
      )

      // Set credentials
      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      // Initialize Analytics Admin API
      const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client })
      
      // List all accounts
      const accountsResponse = await analyticsAdmin.accounts.list()
      const accounts = accountsResponse.data.accounts || []

      const allProperties = []
      
      // For each account, list properties
      for (const account of accounts) {
        try {
          const propertiesResponse = await analyticsAdmin.properties.list({
            filter: \`parent:\${account.name}\`
          })
          
          const properties = propertiesResponse.data.properties || []
          
          for (const property of properties) {
            const propertyId = property.name?.split('/').pop()
            
            allProperties.push({
              propertyId,
              propertyName: property.displayName || \`Property \${propertyId}\`,
              accountName: account.displayName || 'Unknown Account',
              accountId: account.name?.split('/').pop(),
              hasAccess: true,
              createTime: property.createTime,
              industryCategory: property.industryCategory,
              timeZone: property.timeZone,
              currencyCode: property.currencyCode,
              propertyType: property.propertyType
            })
          }
        } catch (error) {
          logger.warn('Failed to fetch properties for account', {
            accountId: account.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Sort properties by name
      allProperties.sort((a, b) => a.propertyName.localeCompare(b.propertyName))

      logger.info('GA4 properties listed successfully', {
        userId: session.user.id,
        accountsCount: accounts.length,
        propertiesCount: allProperties.length
      })

      return NextResponse.json({
        success: true,
        properties: allProperties,
        currentPropertyId: connection.propertyId,
        currentPropertyName: connection.propertyName,
        totalAccounts: accounts.length,
        totalProperties: allProperties.length,
        userRole: user?.role || 'USER'
      })

    } catch (googleError) {
      logger.error('Google API error', googleError)
      
      // If token is expired, indicate that re-authentication is needed
      if (googleError.message?.includes('401') || googleError.message?.includes('invalid_grant')) {
        return NextResponse.json({
          success: false,
          properties: [],
          message: 'Your Google Analytics connection has expired. Please reconnect.',
          needsReconnection: true
        })
      }

      // For other errors, return a generic error message
      return NextResponse.json({
        success: false,
        properties: [],
        message: 'Failed to fetch GA4 properties. Please try again later.',
        error: googleError.message
      })
    }

  } catch (error) {
    logger.error('GA4 list properties error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list properties' },
      { status: 500 }
    )
  }
}`;

// Updated Search Console List Sites API content
const SEARCH_CONSOLE_LIST_SITES_CONTENT = `import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { google } from 'googleapis'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { 
        dealershipId: true, 
        role: true, 
        agencyId: true,
        email: true
      }
    })

    // Check if user has a Search Console connection
    const connection = await prisma.search_console_connections.findFirst({
      where: { userId: session.user.id }
    })

    if (!connection || !connection.accessToken) {
      return NextResponse.json({
        success: false,
        sites: [],
        message: 'No Search Console connection found. Please connect your Google Search Console account.',
        needsConnection: true
      })
    }

    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        \`\${process.env.NEXTAUTH_URL}/api/search-console/callback\`
      )

      // Set credentials
      oauth2Client.setCredentials({
        access_token: decrypt(connection.accessToken),
        refresh_token: connection.refreshToken ? decrypt(connection.refreshToken) : undefined
      })

      // Initialize Search Console API
      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client
      })
      
      // List all sites
      const sitesResponse = await searchConsole.sites.list()
      const allSites = sitesResponse.data.siteEntry || []
      
      // Process sites
      const processedSites = allSites.map(site => ({
        siteUrl: site.siteUrl,
        siteName: site.siteUrl ? new URL(site.siteUrl).hostname : 'Unknown',
        permissionLevel: site.permissionLevel,
        hasFullAccess: site.permissionLevel === 'siteOwner' || site.permissionLevel === 'siteFullUser',
        hasRestrictedAccess: site.permissionLevel === 'siteRestrictedUser',
        canUseApi: site.permissionLevel !== 'siteUnverifiedUser'
      }))

      // Sort sites by permission level
      processedSites.sort((a, b) => {
        if (a.hasFullAccess && !b.hasFullAccess) return -1
        if (!a.hasFullAccess && b.hasFullAccess) return 1
        return 0
      })

      logger.info('Search Console sites listed successfully', {
        userId: session.user.id,
        sitesCount: allSites.length,
        fullAccessCount: processedSites.filter(s => s.hasFullAccess).length
      })

      return NextResponse.json({
        success: true,
        sites: processedSites,
        currentSiteUrl: connection.siteUrl,
        currentSiteName: connection.siteName,
        totalSites: allSites.length,
        fullAccessSites: processedSites.filter(s => s.hasFullAccess).length,
        userRole: user?.role || 'USER'
      })

    } catch (googleError) {
      logger.error('Google API error', googleError)
      
      // If token is expired, indicate that re-authentication is needed
      if (googleError.message?.includes('401') || googleError.message?.includes('invalid_grant')) {
        return NextResponse.json({
          success: false,
          sites: [],
          message: 'Your Search Console connection has expired. Please reconnect.',
          needsReconnection: true
        })
      }

      // For other errors, return a generic error message
      return NextResponse.json({
        success: false,
        sites: [],
        message: 'Failed to fetch Search Console sites. Please try again later.',
        error: googleError.message
      })
    }

  } catch (error) {
    logger.error('Search Console list sites error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list sites' },
      { status: 500 }
    )
  }
}`;

async function backupFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const backupPath = filePath + '.backup.' + Date.now();
    await fs.writeFile(backupPath, content);
    console.log(`✅ Backed up ${path.basename(filePath)} to ${path.basename(backupPath)}`);
  } catch (error) {
    console.log(`⚠️  Could not backup ${path.basename(filePath)}: ${error.message}`);
  }
}

async function updateFile(filePath, content) {
  try {
    await backupFile(filePath);
    await fs.writeFile(filePath, content);
    console.log(`✅ Updated ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to update ${path.basename(filePath)}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Fixing GA4 and Search Console Integration');
  console.log('============================================\n');

  // Step 1: Update API files
  console.log('📝 Updating API endpoints...\n');
  
  const basePath = process.cwd();
  
  // Update GA4 list properties
  await updateFile(
    path.join(basePath, 'app/api/ga4/list-properties/route.ts'),
    GA4_LIST_PROPERTIES_CONTENT
  );
  
  // Update Search Console list sites
  await updateFile(
    path.join(basePath, 'app/api/search-console/list-sites/route.ts'),
    SEARCH_CONSOLE_LIST_SITES_CONTENT
  );

  console.log('\n✅ API endpoints updated successfully!');
  
  console.log('\n📋 Next Steps:');
  console.log('==============');
  console.log('1. Run the database setup script:');
  console.log('   node reverse-and-fix-dealerships.js\n');
  console.log('2. Restart your development server:');
  console.log('   npm run dev\n');
  console.log('3. Clear browser cache and cookies');
  console.log('4. Log in and go to Settings to connect Google accounts');
  console.log('5. Visit the Reporting page to see real data\n');
  
  console.log('🎯 Important Notes:');
  console.log('==================');
  console.log('- Make sure your Google OAuth credentials are properly configured');
  console.log('- Users need to authenticate with Google to see real data');
  console.log('- The system will fall back to mock data if API calls fail');
  console.log('- Check the logs for any authentication errors\n');
}

main().catch(console.error);
