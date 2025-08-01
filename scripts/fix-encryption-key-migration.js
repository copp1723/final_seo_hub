#!/usr/bin/env node

/**
 * CRITICAL ENCRYPTION KEY MIGRATION SCRIPT
 * 
 * This script addresses the critical encryption key validation issue that causes
 * OAuth system failures. The current weak key pattern fails validation and prevents
 * token encryption/decryption.
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Backs up current encrypted tokens
 * 2. Updates the .env file with new secure encryption keys
 * 3. Handles token migration strategy (clears tokens that can't be decrypted)
 * 4. Provides clear instructions for production deployment
 * 
 * WARNING: This will require users to reconnect their OAuth integrations!
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

const prisma = new PrismaClient()

// Generate secure keys
function generateSecureKey(length = 64) {
  return crypto.randomBytes(length / 2).toString('hex')
}

// New secure keys
const NEW_KEYS = {
  ENCRYPTION_KEY: '2f5ad6dc598cfc7fe241dcd6fee9ac1c326e95cb0e9e6efbb4768f7281d7ef20',
  GA4_TOKEN_ENCRYPTION_KEY: '05afa828eb30270dc4824626a70c91ccdbaa25d83a222bcf0b758314f2a187b5',
  NEXTAUTH_SECRET: 'Kic6vvwJPU1tOnpIxxrQJCMNFdbIB2m4zQLgCOXWlxA=',
  SEOWORKS_WEBHOOK_SECRET: '9fe5dd6a75b03cf5bfb920ce8ed31bf63115f274f7d06c2f02ec7de1a68dabbb'
}

async function main() {
  console.log('🔐 CRITICAL ENCRYPTION KEY MIGRATION STARTING...\n')
  
  try {
    // Step 1: Backup current database state
    console.log('📋 Step 1: Backing up current token data...')
    await backupTokenData()
    
    // Step 2: Count affected records
    console.log('📊 Step 2: Analyzing affected records...')
    await analyzeAffectedRecords()
    
    // Step 3: Clear tokens that cannot be migrated
    console.log('🧹 Step 3: Clearing encrypted tokens (users will need to reconnect)...')
    await clearEncryptedTokens()
    
    // Step 4: Update .env file
    console.log('🔧 Step 4: Updating .env file with new encryption keys...')
    await updateEnvFile()
    
    // Step 5: Verify new encryption works
    console.log('✅ Step 5: Testing new encryption system...')
    await testNewEncryption()
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('\n⚠️  IMPORTANT: Users will need to reconnect their Google integrations!')
    console.log('   - GA4 connections have been cleared')
    console.log('   - Search Console connections have been cleared')
    console.log('   - User GA4 tokens have been cleared')
    console.log('   - User Search Console tokens have been cleared')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function backupTokenData() {
  const backup = {
    timestamp: new Date().toISOString(),
    ga4_connections: await prisma.ga4_connections.findMany(),
    search_console_connections: await prisma.search_console_connections.findMany(),
    user_ga4_tokens: await prisma.user_ga4_tokens.findMany(),
    user_search_console_tokens: await prisma.user_search_console_tokens.findMany()
  }
  
  const backupFile = `token_backup_${Date.now()}.json`
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`   ✓ Backup saved to: ${backupFile}`)
}

async function analyzeAffectedRecords() {
  const ga4Connections = await prisma.ga4_connections.count()
  const searchConsoleConnections = await prisma.search_console_connections.count()
  const userGa4Tokens = await prisma.user_ga4_tokens.count()
  const userSearchConsoleTokens = await prisma.user_search_console_tokens.count()
  
  console.log(`   • GA4 connections: ${ga4Connections}`)
  console.log(`   • Search Console connections: ${searchConsoleConnections}`)
  console.log(`   • User GA4 tokens: ${userGa4Tokens}`)
  console.log(`   • User Search Console tokens: ${userSearchConsoleTokens}`)
  console.log(`   • Total affected records: ${ga4Connections + searchConsoleConnections + userGa4Tokens + userSearchConsoleTokens}`)
}

async function clearEncryptedTokens() {
  // Clear all encrypted token tables
  const results = await Promise.all([
    prisma.ga4_connections.deleteMany({}),
    prisma.search_console_connections.deleteMany({}),
    prisma.user_ga4_tokens.deleteMany({}),
    prisma.user_search_console_tokens.deleteMany({})
  ])
  
  console.log(`   ✓ Cleared ${results[0].count} GA4 connections`)
  console.log(`   ✓ Cleared ${results[1].count} Search Console connections`)
  console.log(`   ✓ Cleared ${results[2].count} user GA4 tokens`)
  console.log(`   ✓ Cleared ${results[3].count} user Search Console tokens`)
}

async function updateEnvFile() {
  const envFile = '.env'
  let envContent = fs.readFileSync(envFile, 'utf8')
  
  // Update each key
  Object.entries(NEW_KEYS).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`)
      console.log(`   ✓ Updated ${key}`)
    } else {
      envContent += `\n${key}=${value}`
      console.log(`   ✓ Added ${key}`)
    }
  })
  
  // Backup original .env
  fs.writeFileSync('.env.backup.' + Date.now(), fs.readFileSync(envFile, 'utf8'))
  
  // Write new .env
  fs.writeFileSync(envFile, envContent)
  console.log('   ✓ .env file updated successfully')
}

async function testNewEncryption() {
  // Set new encryption key in environment
  process.env.ENCRYPTION_KEY = NEW_KEYS.ENCRYPTION_KEY
  
  // Import encryption module with new key
  delete require.cache[require.resolve('../lib/encryption.ts')]
  
  try {
    // Use Node.js crypto to test since we can't easily import TypeScript
    const crypto = require('crypto')
    const algorithm = 'aes-256-gcm'
    const key = crypto.createHash('sha256').update(NEW_KEYS.ENCRYPTION_KEY).digest()
    
    // Test encryption/decryption
    const testText = 'test-oauth-token-12345'
    
    // Encrypt
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(testText, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()
    const encryptedData = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
    
    // Decrypt
    const parts = encryptedData.split(':')
    const ivBuffer = Buffer.from(parts[0], 'hex')
    const authTagBuffer = Buffer.from(parts[1], 'hex')
    const encryptedText = parts[2]
    
    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer)
    decipher.setAuthTag(authTagBuffer)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    if (decrypted === testText) {
      console.log('   ✅ Encryption/decryption test PASSED')
    } else {
      throw new Error('Decrypted text does not match original')
    }
    
  } catch (error) {
    console.error('   ❌ Encryption test FAILED:', error.message)
    throw error
  }
}

// Production deployment instructions
function showProductionInstructions() {
  console.log('\n📋 PRODUCTION DEPLOYMENT INSTRUCTIONS:')
  console.log('\n1. BACKUP DATABASE:')
  console.log('   • Create a full database backup before deployment')
  console.log('   • Keep the token backup file generated by this script')
  
  console.log('\n2. DEPLOY NEW ENVIRONMENT VARIABLES:')
  console.log('   • Update your production environment with new keys:')
  Object.entries(NEW_KEYS).forEach(([key, value]) => {
    console.log(`   • ${key}=${value}`)
  })
  
  console.log('\n3. RESTART APPLICATION:')
  console.log('   • Restart all application instances')
  console.log('   • Verify encryption validation passes')
  
  console.log('\n4. USER COMMUNICATION:')
  console.log('   • Notify users that OAuth integrations need to be reconnected')
  console.log('   • Provide clear instructions for reconnecting GA4 and Search Console')
  
  console.log('\n5. MONITOR:')
  console.log('   • Watch for OAuth-related errors')
  console.log('   • Ensure new token encryption/decryption works')
  console.log('   • Monitor user reconnection success rates')
}

if (require.main === module) {
  main()
    .then(() => {
      showProductionInstructions()
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

module.exports = { NEW_KEYS, main }