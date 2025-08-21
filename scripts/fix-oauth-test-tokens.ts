#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'
import { decrypt } from '@/lib/encryption'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

interface CleanupStats {
  totalGA4Connections: number
  totalSCConnections: number
  testGA4TokensFound: number
  testSCTokensFound: number
  testGA4TokensDeleted: number
  testSCTokensDeleted: number
  errors: string[]
}

/**
 * Check if a token is a test/dummy token
 */
function isTestToken(token: string | null): boolean {
  if (!token) return false
  
  try {
    const decrypted = decrypt(token)
    return (
      decrypted.startsWith('test_') ||
      decrypted.includes('test_access_token') ||
      decrypted.includes('test_refresh_token') ||
      decrypted.length < 50 // Real OAuth tokens are much longer
    )
  } catch (error) {
    // If we can't decrypt it, it might be corrupted, consider it invalid
    return true
  }
}

/**
 * Clean up test/dummy OAuth tokens that cause invalid_grant errors
 */
async function fixOAuthTestTokens(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalGA4Connections: 0,
    totalSCConnections: 0,
    testGA4TokensFound: 0,
    testSCTokensFound: 0,
    testGA4TokensDeleted: 0,
    testSCTokensDeleted: 0,
    errors: []
  }

  try {
    console.log('🔍 Starting OAuth test token cleanup...')

    // Get all GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        propertyId: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        email: true,
        dealerships: {
          select: { name: true }
        }
      }
    })

    stats.totalGA4Connections = ga4Connections.length
    console.log(`📊 Found ${ga4Connections.length} GA4 connections`)

    // Check each GA4 connection for test tokens
    const testGA4Connections: Array<any> = []
    for (const conn of ga4Connections) {
      const hasTestAccessToken = isTestToken(conn.accessToken)
      const hasTestRefreshToken = isTestToken(conn.refreshToken)
      
      if (hasTestAccessToken || hasTestRefreshToken) {
        stats.testGA4TokensFound++
        testGA4Connections.push({
          ...conn,
          hasTestAccessToken,
          hasTestRefreshToken
        })
        
        console.log(`❌ GA4 Connection ${conn.id} has test tokens:`)
        console.log(`  - Dealership: ${conn.dealerships?.name || 'User-level'} (${conn.dealershipId})`)
        console.log(`  - Property: ${conn.propertyId}`)
        console.log(`  - User: ${conn.email || conn.userId}`)
        console.log(`  - Test Access Token: ${hasTestAccessToken}`)
        console.log(`  - Test Refresh Token: ${hasTestRefreshToken}`)
        console.log(`  - Expires: ${conn.expiresAt}`)
      }
    }

    // Get all Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        siteUrl: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        email: true,
        dealerships: {
          select: { name: true }
        }
      }
    })

    stats.totalSCConnections = scConnections.length
    console.log(`🔍 Found ${scConnections.length} Search Console connections`)

    // Check each SC connection for test tokens
    const testSCConnections: Array<any> = []
    for (const conn of scConnections) {
      const hasTestAccessToken = isTestToken(conn.accessToken)
      const hasTestRefreshToken = isTestToken(conn.refreshToken)
      
      if (hasTestAccessToken || hasTestRefreshToken) {
        stats.testSCTokensFound++
        testSCConnections.push({
          ...conn,
          hasTestAccessToken,
          hasTestRefreshToken
        })
        
        console.log(`❌ SC Connection ${conn.id} has test tokens:`)
        console.log(`  - Dealership: ${conn.dealerships?.name || 'User-level'} (${conn.dealershipId})`)
        console.log(`  - Site: ${conn.siteUrl}`)
        console.log(`  - User: ${conn.email || conn.userId}`)
        console.log(`  - Test Access Token: ${hasTestAccessToken}`)
        console.log(`  - Test Refresh Token: ${hasTestRefreshToken}`)
        console.log(`  - Expires: ${conn.expiresAt}`)
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`  - Total GA4 connections: ${stats.totalGA4Connections}`)
    console.log(`  - GA4 with test tokens: ${stats.testGA4TokensFound}`)
    console.log(`  - Total SC connections: ${stats.totalSCConnections}`)
    console.log(`  - SC with test tokens: ${stats.testSCTokensFound}`)

    if (stats.testGA4TokensFound === 0 && stats.testSCTokensFound === 0) {
      console.log('✅ No test tokens found! System is clean.')
      return stats
    }

    console.log(`\n⚠️  Found ${stats.testGA4TokensFound + stats.testSCTokensFound} connections with test tokens`)
    console.log('❗ These connections will cause invalid_grant errors and prevent data flow')
    console.log('\n🧹 Starting cleanup...')

    // Use transaction to ensure consistent cleanup
    await prisma.$transaction(async (tx) => {
      // Delete GA4 connections with test tokens
      if (testGA4Connections.length > 0) {
        const ga4IdsToDelete = testGA4Connections.map(c => c.id)
        
        const deleteResult = await tx.ga4_connections.deleteMany({
          where: { id: { in: ga4IdsToDelete } }
        })
        
        stats.testGA4TokensDeleted = deleteResult.count
        console.log(`🗑️  Deleted ${deleteResult.count} GA4 connections with test tokens`)
        
        // Log specific deletions
        testGA4Connections.forEach(conn => {
          console.log(`  - Deleted GA4 ${conn.id} (${conn.dealerships?.name || 'User-level'})`)
        })
      }

      // Delete Search Console connections with test tokens
      if (testSCConnections.length > 0) {
        const scIdsToDelete = testSCConnections.map(c => c.id)
        
        const deleteResult = await tx.search_console_connections.deleteMany({
          where: { id: { in: scIdsToDelete } }
        })
        
        stats.testSCTokensDeleted = deleteResult.count
        console.log(`🗑️  Deleted ${deleteResult.count} Search Console connections with test tokens`)
        
        // Log specific deletions
        testSCConnections.forEach(conn => {
          console.log(`  - Deleted SC ${conn.id} (${conn.dealerships?.name || 'User-level'})`)
        })
      }
    })

    console.log('\n✅ Cleanup completed successfully!')
    console.log('🔄 Users will need to re-authorize their Google accounts to restore analytics data')
    console.log('📝 Next steps:')
    console.log('  1. User goes to Settings > Integrations')
    console.log('  2. User clicks "Connect Google Analytics" and/or "Connect Search Console"')
    console.log('  3. User completes OAuth flow with real Google credentials')
    console.log('  4. System stores valid tokens and data flows properly')

    return stats

  } catch (error) {
    const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    stats.errors.push(errorMsg)
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}

/**
 * Validate that cleanup was successful
 */
async function validateCleanup(): Promise<void> {
  console.log('\n🔍 Validating cleanup...')
  
  const [ga4Connections, scConnections] = await Promise.all([
    prisma.ga4_connections.findMany({
      select: { id: true, accessToken: true, refreshToken: true }
    }),
    prisma.search_console_connections.findMany({
      select: { id: true, accessToken: true, refreshToken: true }
    })
  ])

  let remainingTestTokens = 0

  // Check remaining GA4 connections
  for (const conn of ga4Connections) {
    if (isTestToken(conn.accessToken) || isTestToken(conn.refreshToken)) {
      remainingTestTokens++
      console.log(`⚠️  GA4 connection ${conn.id} still has test tokens`)
    }
  }

  // Check remaining SC connections
  for (const conn of scConnections) {
    if (isTestToken(conn.accessToken) || isTestToken(conn.refreshToken)) {
      remainingTestTokens++
      console.log(`⚠️  SC connection ${conn.id} still has test tokens`)
    }
  }

  if (remainingTestTokens === 0) {
    console.log('✅ Validation passed: No test tokens remaining')
  } else {
    console.log(`❌ Validation failed: ${remainingTestTokens} connections still have test tokens`)
    throw new Error(`Cleanup incomplete: ${remainingTestTokens} test tokens remain`)
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 OAuth Test Token Fix - Starting...')
    console.log('📅 ' + new Date().toISOString())
    console.log('')

    const stats = await fixOAuthTestTokens()
    await validateCleanup()

    console.log('\n🎉 OAuth test token fix completed successfully!')
    console.log('📊 Final stats:', {
      totalConnections: stats.totalGA4Connections + stats.totalSCConnections,
      testTokensFound: stats.testGA4TokensFound + stats.testSCTokensFound,
      testTokensDeleted: stats.testGA4TokensDeleted + stats.testSCTokensDeleted,
      errors: stats.errors.length
    })

  } catch (error) {
    console.error('\n💥 Fix failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
main()