#!/usr/bin/env node

/**
 * Clear encrypted tokens after encryption key change
 * This is necessary because tokens encrypted with the old key cannot be decrypted with the new key
 */

const { PrismaClient } = require('@prisma/client')

async function clearEncryptedTokens() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔐 Clearing encrypted tokens after encryption key change...')
    
    // Clear GA4 connections
    const ga4Result = await prisma.ga4_connections.deleteMany({})
    console.log(`✅ Cleared ${ga4Result.count} GA4 connections`)
    
    // Clear Search Console connections  
    const scResult = await prisma.search_console_connections.deleteMany({})
    console.log(`✅ Cleared ${scResult.count} Search Console connections`)
    
    console.log('')
    console.log('🎉 Migration complete!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Restart your development server')
    console.log('2. Users will need to reconnect their Google accounts')
    console.log('3. Set up dealership-specific connections')
    console.log('')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearEncryptedTokens()
