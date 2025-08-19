#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'
import { decrypt } from '@/lib/encryption'

const prisma = new PrismaClient()

async function debugOAuthTokens() {
  try {
    console.log('🔍 Debugging OAuth tokens for dealer-acura-columbus...')
    
    // Check user info
    const user = await prisma.users.findUnique({
      where: { id: 'f0f77fa5-e611-47f0-807a-134b54b99bad' },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        agencyId: true, 
        dealershipId: true 
      }
    })
    console.log('👤 User info:', user)
    
    // Check dealership info
    const dealership = await prisma.dealerships.findUnique({
      where: { id: 'dealer-acura-columbus' },
      select: { 
        id: true, 
        name: true, 
        agencyId: true 
      }
    })
    console.log('🏢 Dealership info:', dealership)
    
    // Find GA4 connections for this dealership
    const ga4Connections = await prisma.ga4_connections.findMany({
      where: { dealershipId: 'dealer-acura-columbus' },
      select: {
        id: true,
        userId: true,
        propertyId: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    console.log('📊 GA4 connections found:', ga4Connections.length)
    
    for (const conn of ga4Connections) {
      try {
        const accessToken = conn.accessToken ? decrypt(conn.accessToken) : null
        const refreshToken = conn.refreshToken ? decrypt(conn.refreshToken) : null
        
        console.log(`\n🔗 GA4 Connection ${conn.id}:`)
        console.log(`  Property ID: ${conn.propertyId}`)
        console.log(`  User ID: ${conn.userId}`)
        console.log(`  Expires At: ${conn.expiresAt}`)
        console.log(`  Access Token: ${accessToken ? (accessToken.substring(0, 30) + '...') : 'NULL'}`)
        console.log(`  Refresh Token: ${refreshToken ? (refreshToken.substring(0, 30) + '...') : 'NULL'}`)
        console.log(`  Is Test Token: ${refreshToken?.startsWith('test_') ? 'YES' : 'NO'}`)
        console.log(`  Updated: ${conn.updatedAt}`)
      } catch (decryptError) {
        console.log(`\n❌ Failed to decrypt tokens for ${conn.id}:`, decryptError.message)
      }
    }
    
    // Find Search Console connections for this dealership
    const scConnections = await prisma.search_console_connections.findMany({
      where: { dealershipId: 'dealer-acura-columbus' },
      select: {
        id: true,
        userId: true,
        siteUrl: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    console.log('\n🔍 Search Console connections found:', scConnections.length)
    
    for (const conn of scConnections) {
      try {
        const accessToken = conn.accessToken ? decrypt(conn.accessToken) : null
        const refreshToken = conn.refreshToken ? decrypt(conn.refreshToken) : null
        
        console.log(`\n🌐 SC Connection ${conn.id}:`)
        console.log(`  Site URL: ${conn.siteUrl}`)
        console.log(`  User ID: ${conn.userId}`)
        console.log(`  Expires At: ${conn.expiresAt}`)
        console.log(`  Access Token: ${accessToken ? (accessToken.substring(0, 30) + '...') : 'NULL'}`)
        console.log(`  Refresh Token: ${refreshToken ? (refreshToken.substring(0, 30) + '...') : 'NULL'}`)
        console.log(`  Is Test Token: ${refreshToken?.startsWith('test_') ? 'YES' : 'NO'}`)
        console.log(`  Updated: ${conn.updatedAt}`)
      } catch (decryptError) {
        console.log(`\n❌ Failed to decrypt tokens for ${conn.id}:`, decryptError.message)
      }
    }
    
    // Check if there are any connections from other sources (user/agency level)
    console.log('\n🔄 Checking for agency/user level connections...')
    
    if (user?.agencyId) {
      const agencyDealerships = await prisma.dealerships.findMany({
        where: { agencyId: user.agencyId },
        select: { id: true }
      })
      const dealershipIds = agencyDealerships.map(d => d.id)
      
      const agencyGA4 = await prisma.ga4_connections.findMany({
        where: { dealershipId: { in: dealershipIds } },
        orderBy: { updatedAt: 'desc' },
        take: 3
      })
      
      console.log(`🏢 Agency GA4 connections found: ${agencyGA4.length}`)
      
      for (const conn of agencyGA4) {
        try {
          const refreshToken = conn.refreshToken ? decrypt(conn.refreshToken) : null
          console.log(`  - ${conn.id} (${conn.dealershipId}): ${refreshToken?.startsWith('test_') ? 'TEST TOKEN' : 'REAL TOKEN'}`)
        } catch (e) {
          console.log(`  - ${conn.id} (${conn.dealershipId}): DECRYPT ERROR`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugOAuthTokens()