#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnoseGA4Integration() {
  console.log('🔍 GA4 Integration Diagnostic Report')
  console.log('=' .repeat(60))
  
  try {
    // 1. Check all GA4 connections
    console.log('\n📊 1. GA4 CONNECTIONS STATUS')
    console.log('-'.repeat(40))
    
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          select: {
            email: true,
            role: true,
            dealershipId: true
          }
        }
      }
    })
    
    if (ga4Connections.length === 0) {
      console.log('❌ No GA4 connections found in database')
      return
    }
    
    console.log(`✅ Found ${ga4Connections.length} GA4 connection(s)`)
    
    for (const connection of ga4Connections) {
      console.log(`\n👤 User: ${connection.users.email} (${connection.users.role})`)
      console.log(`   🔗 Connection ID: ${connection.id}`)
      console.log(`   🏢 Dealership ID: ${connection.dealershipId || 'Not set'}`)
      console.log(`   📈 Property ID: ${connection.propertyId || 'Not set'}`)
      console.log(`   📝 Property Name: ${connection.propertyName || 'Not set'}`)
      console.log(`   🔑 Has Access Token: ${connection.accessToken ? 'Yes' : 'No'}`)
      console.log(`   🔄 Has Refresh Token: ${connection.refreshToken ? 'Yes' : 'No'}`)
      console.log(`   ⏰ Expires At: ${connection.expiresAt || 'Not set'}`)
      console.log(`   📅 Created: ${connection.createdAt}`)
      console.log(`   🔄 Updated: ${connection.updatedAt}`)
      
      // Check if token is expired
      if (connection.expiresAt) {
        const isExpired = new Date() > connection.expiresAt
        console.log(`   ⚠️  Token Status: ${isExpired ? 'EXPIRED' : 'Valid'}`)
      }
    }
    
    // 2. Check dealership mappings
    console.log('\n🏢 2. DEALERSHIP MAPPINGS')
    console.log('-'.repeat(40))
    
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true,
        agencies: {
          select: {
            name: true
          }
        }
      }
    })
    
    console.log(`📋 Found ${dealerships.length} dealership(s)`)
    
    for (const dealership of dealerships) {
      const hasGA4Connection = ga4Connections.some(c => c.dealershipId === dealership.id)
      console.log(`\n🏢 ${dealership.name}`)
      console.log(`   🏢 ID: ${dealership.id}`)
      console.log(`   🏢 Agency: ${dealership.agencies.name}`)
      console.log(`   📈 GA4 Connection: ${hasGA4Connection ? '✅ Connected' : '❌ Not connected'}`)
      
      if (hasGA4Connection) {
        const connection = ga4Connections.find(c => c.dealershipId === dealership.id)
        console.log(`   📊 Property: ${connection.propertyName || connection.propertyId || 'Not set'}`)
      }
    }
    
    // 3. Check agency-level GA4 settings
    console.log('\n🏢 3. AGENCY GA4 SETTINGS')
    console.log('-'.repeat(40))
    
    const agencies = await prisma.agencies.findMany({
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        ga4PropertyName: true,
        ga4RefreshToken: true
      }
    })
    
    for (const agency of agencies) {
      console.log(`\n🏢 ${agency.name}`)
      console.log(`   🏢 ID: ${agency.id}`)
      console.log(`   📈 GA4 Property ID: ${agency.ga4PropertyId || 'Not set'}`)
      console.log(`   📝 GA4 Property Name: ${agency.ga4PropertyName || 'Not set'}`)
      console.log(`   🔄 Has Refresh Token: ${agency.ga4RefreshToken ? 'Yes' : 'No'}`)
    }
    
    // 4. Check for potential issues
    console.log('\n⚠️  4. POTENTIAL ISSUES')
    console.log('-'.repeat(40))
    
    let issuesFound = 0
    
    // Check for connections without property IDs
    const connectionsWithoutProperty = ga4Connections.filter(c => !c.propertyId)
    if (connectionsWithoutProperty.length > 0) {
      console.log(`❌ ${connectionsWithoutProperty.length} connection(s) without property ID`)
      issuesFound++
    }
    
    // Check for expired tokens
    const expiredTokens = ga4Connections.filter(c => c.expiresAt && new Date() > c.expiresAt)
    if (expiredTokens.length > 0) {
      console.log(`❌ ${expiredTokens.length} connection(s) with expired tokens`)
      issuesFound++
    }
    
    // Check for connections without access tokens
    const noAccessToken = ga4Connections.filter(c => !c.accessToken)
    if (noAccessToken.length > 0) {
      console.log(`❌ ${noAccessToken.length} connection(s) without access token`)
      issuesFound++
    }
    
    // Check for dealerships without GA4 connections
    const dealershipsWithoutGA4 = dealerships.filter(d => 
      !ga4Connections.some(c => c.dealershipId === d.id)
    )
    if (dealershipsWithoutGA4.length > 0) {
      console.log(`❌ ${dealershipsWithoutGA4.length} dealership(s) without GA4 connection`)
      issuesFound++
    }
    
    if (issuesFound === 0) {
      console.log('✅ No obvious issues found in database')
    }
    
    // 5. Recommendations
    console.log('\n💡 5. RECOMMENDATIONS')
    console.log('-'.repeat(40))
    
    if (connectionsWithoutProperty.length > 0) {
      console.log('🔧 Run property setup for connections without property IDs')
    }
    
    if (expiredTokens.length > 0) {
      console.log('🔄 Refresh expired GA4 tokens')
    }
    
    if (dealershipsWithoutGA4.length > 0) {
      console.log('🔗 Connect GA4 accounts for dealerships without connections')
    }
    
    console.log('🔍 Test GA4 API endpoints manually')
    console.log('📊 Verify property listing API returns all properties')
    console.log('📈 Check data collection for connected properties')
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the diagnostic
diagnoseGA4Integration() 