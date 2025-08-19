#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'
import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

/**
 * Test the OAuth fix for the specific failing user/dealership combination
 */
async function testOAuthFix() {
  const testUserId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
  const testDealershipId = 'dealer-acura-columbus'
  
  console.log('🧪 Testing OAuth fix for specific failing case...')
  console.log(`👤 User ID: ${testUserId}`)
  console.log(`🏢 Dealership ID: ${testDealershipId}`)
  console.log('')

  try {
    // Test 1: Verify no test tokens remain in database
    console.log('🔍 Test 1: Checking for remaining test tokens...')
    
    const [ga4Connections, scConnections] = await Promise.all([
      prisma.ga4_connections.findMany({
        where: {
          OR: [
            { userId: testUserId },
            { dealershipId: testDealershipId }
          ]
        },
        select: {
          id: true,
          dealershipId: true,
          accessToken: true,
          refreshToken: true
        }
      }),
      prisma.search_console_connections.findMany({
        where: {
          OR: [
            { userId: testUserId },
            { dealershipId: testDealershipId }
          ]
        },
        select: {
          id: true,
          dealershipId: true,
          accessToken: true,
          refreshToken: true
        }
      })
    ])

    console.log(`📊 Found ${ga4Connections.length} GA4 connections`)
    console.log(`🔍 Found ${scConnections.length} Search Console connections`)

    if (ga4Connections.length === 0 && scConnections.length === 0) {
      console.log('✅ No OAuth connections found - cleanup was successful')
    } else {
      console.log('❌ OAuth connections still exist (this could be valid if user re-authorized)')
    }

    // Test 2: Test GA4 analytics fetch
    console.log('\n🔍 Test 2: Testing GA4 analytics fetch...')
    
    const analyticsService = new DealershipAnalyticsService()
    const startDate = '2024-08-01'
    const endDate = '2024-08-19'

    const ga4Result = await analyticsService['getDealershipGA4Data']({
      startDate,
      endDate,
      dealershipId: testDealershipId,
      userId: testUserId
    })

    console.log('📊 GA4 Result:')
    console.log(`  - Has Connection: ${ga4Result.hasConnection}`)
    console.log(`  - Property ID: ${ga4Result.propertyId || 'None'}`)
    console.log(`  - Error: ${ga4Result.error || 'None'}`)
    console.log(`  - Has Data: ${!!ga4Result.data}`)

    if (!ga4Result.hasConnection) {
      console.log('✅ GA4 correctly reports no connection (user needs to re-authorize)')
    } else if (ga4Result.error && ga4Result.error.includes('expired')) {
      console.log('❌ GA4 still has token errors - fix may be incomplete')
    } else if (ga4Result.data) {
      console.log('🎉 GA4 data fetch successful - user has valid connection!')
    }

    // Test 3: Test Search Console analytics fetch
    console.log('\n🔍 Test 3: Testing Search Console analytics fetch...')
    
    const scResult = await analyticsService['getDealershipSearchConsoleData']({
      startDate,
      endDate,
      dealershipId: testDealershipId,
      userId: testUserId
    })

    console.log('🔍 Search Console Result:')
    console.log(`  - Has Connection: ${scResult.hasConnection}`)
    console.log(`  - Site URL: ${scResult.siteUrl || 'None'}`)
    console.log(`  - Error: ${scResult.error || 'None'}`)
    console.log(`  - Has Data: ${!!scResult.data}`)
    console.log(`  - Permission Status: ${scResult.permissionStatus}`)

    if (!scResult.hasConnection) {
      console.log('✅ Search Console correctly reports no connection (user needs to re-authorize)')
    } else if (scResult.error && scResult.error.includes('expired')) {
      console.log('❌ Search Console still has token errors - fix may be incomplete')
    } else if (scResult.data) {
      console.log('🎉 Search Console data fetch successful - user has valid connection!')
    }

    // Test 4: Test full dashboard analytics
    console.log('\n🔍 Test 4: Testing full dashboard analytics...')
    
    const dashboardResult = await analyticsService.getDealershipAnalytics({
      startDate,
      endDate,
      dealershipId: testDealershipId,
      userId: testUserId
    })

    console.log('📊 Dashboard Analytics Result:')
    console.log(`  - GA4 Error: ${dashboardResult.errors.ga4Error || 'None'}`)
    console.log(`  - SC Error: ${dashboardResult.errors.searchConsoleError || 'None'}`)
    console.log(`  - Has GA4 Connection: ${dashboardResult.metadata.hasGA4Connection}`)
    console.log(`  - Has SC Connection: ${dashboardResult.metadata.hasSearchConsoleConnection}`)
    console.log(`  - GA4 Sessions: ${dashboardResult.ga4Data?.sessions || 'N/A'}`)
    console.log(`  - SC Clicks: ${dashboardResult.searchConsoleData?.clicks || 'N/A'}`)

    // Check if error messages are user-friendly
    const ga4ErrorMessage = dashboardResult.errors.ga4Error
    const scErrorMessage = dashboardResult.errors.searchConsoleError
    
    if (ga4ErrorMessage && ga4ErrorMessage.includes('Settings > Integrations')) {
      console.log('✅ GA4 error message is user-friendly and actionable')
    } else if (ga4ErrorMessage) {
      console.log(`❌ GA4 error message could be improved: "${ga4ErrorMessage}"`)
    }

    if (scErrorMessage && scErrorMessage.includes('Settings > Integrations')) {
      console.log('✅ Search Console error message is user-friendly and actionable')
    } else if (scErrorMessage) {
      console.log(`❌ Search Console error message could be improved: "${scErrorMessage}"`)
    }

    // Summary
    console.log('\n📋 Test Summary:')
    
    const hasInvalidTokenErrors = (
      (ga4ErrorMessage && ga4ErrorMessage.includes('invalid_grant')) ||
      (scErrorMessage && scErrorMessage.includes('invalid_grant'))
    )

    const hasUserFriendlyErrors = (
      (!ga4ErrorMessage || ga4ErrorMessage.includes('Settings > Integrations')) &&
      (!scErrorMessage || scErrorMessage.includes('Settings > Integrations'))
    )

    if (hasInvalidTokenErrors) {
      console.log('❌ FAILED: Still getting invalid_grant errors')
      return false
    } else if (!hasUserFriendlyErrors) {
      console.log('⚠️  PARTIAL: No invalid_grant errors but error messages could be better')
      return true
    } else {
      console.log('✅ SUCCESS: No invalid_grant errors and user-friendly error messages')
      return true
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

// Run the test
async function main() {
  try {
    console.log('🚀 OAuth Fix Test - Starting...')
    console.log('📅 ' + new Date().toISOString())
    console.log('')

    const success = await testOAuthFix()
    
    console.log('\n🎯 Final Result:', success ? 'PASSED' : 'FAILED')
    process.exit(success ? 0 : 1)

  } catch (error) {
    console.error('\n💥 Test crashed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()