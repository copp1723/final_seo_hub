#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { decrypt } = require('../lib/encryption')

const prisma = new PrismaClient()

async function checkTokenHealth() {
  try {
    const userId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
    const dealershipId = 'dealer-acura-columbus'

    console.log('🔍 Checking token health for user:', userId)
    console.log('🔍 Dealership:', dealershipId)
    
    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      where: {
        OR: [
          { userId: userId },
          { dealershipId: dealershipId }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    })

    console.log('\n📊 GA4 Connections:')
    ga4Connections.forEach((conn, i) => {
      console.log(`Connection ${i + 1}:`)
      console.log(`  ID: ${conn.id}`)
      console.log(`  User ID: ${conn.userId}`)
      console.log(`  Dealership ID: ${conn.dealershipId || 'none'}`)
      console.log(`  Property ID: ${conn.propertyId}`)
      console.log(`  Has Access Token: ${!!conn.accessToken}`)
      console.log(`  Has Refresh Token: ${!!conn.refreshToken}`)
      console.log(`  Expires At: ${conn.expiresAt?.toISOString() || 'unknown'}`)
      console.log(`  Is Expired: ${conn.expiresAt ? conn.expiresAt <= new Date() : 'unknown'}`)
      console.log(`  Created: ${conn.createdAt.toISOString()}`)
      console.log(`  Updated: ${conn.updatedAt.toISOString()}`)
      console.log()
      
      // Try to decrypt tokens to check if they're valid
      if (conn.accessToken) {
        try {
          const decrypted = decrypt(conn.accessToken)
          console.log(`  Access Token Length: ${decrypted.length}`)
        } catch (error) {
          console.log(`  ❌ Failed to decrypt access token: ${error.message}`)
        }
      }
      
      if (conn.refreshToken) {
        try {
          const decrypted = decrypt(conn.refreshToken)
          console.log(`  Refresh Token Length: ${decrypted.length}`)
        } catch (error) {
          console.log(`  ❌ Failed to decrypt refresh token: ${error.message}`)
        }
      }
      console.log('---')
    })

    // Check Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      where: {
        OR: [
          { userId: userId },
          { dealershipId: dealershipId }
        ]
      },
      orderBy: { updatedAt: 'desc' }
    })

    console.log('\n🔎 Search Console Connections:')
    scConnections.forEach((conn, i) => {
      console.log(`Connection ${i + 1}:`)
      console.log(`  ID: ${conn.id}`)
      console.log(`  User ID: ${conn.userId}`)
      console.log(`  Dealership ID: ${conn.dealershipId || 'none'}`)
      console.log(`  Site URL: ${conn.siteUrl}`)
      console.log(`  Has Access Token: ${!!conn.accessToken}`)
      console.log(`  Has Refresh Token: ${!!conn.refreshToken}`)
      console.log(`  Expires At: ${conn.expiresAt?.toISOString() || 'unknown'}`)
      console.log(`  Is Expired: ${conn.expiresAt ? conn.expiresAt <= new Date() : 'unknown'}`)
      console.log(`  Created: ${conn.createdAt.toISOString()}`)
      console.log(`  Updated: ${conn.updatedAt.toISOString()}`)
      console.log()
      
      // Try to decrypt tokens to check if they're valid
      if (conn.accessToken) {
        try {
          const decrypted = decrypt(conn.accessToken)
          console.log(`  Access Token Length: ${decrypted.length}`)
        } catch (error) {
          console.log(`  ❌ Failed to decrypt access token: ${error.message}`)
        }
      }
      
      if (conn.refreshToken) {
        try {
          const decrypted = decrypt(conn.refreshToken)
          console.log(`  Refresh Token Length: ${decrypted.length}`)
        } catch (error) {
          console.log(`  ❌ Failed to decrypt refresh token: ${error.message}`)
        }
      }
      console.log('---')
    })

  } catch (error) {
    console.error('❌ Error checking token health:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTokenHealth()