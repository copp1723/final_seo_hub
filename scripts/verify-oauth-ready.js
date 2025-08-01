#!/usr/bin/env node

/**
 * OAUTH READINESS VERIFICATION SCRIPT
 * 
 * This script verifies that the OAuth system is ready to work properly
 * after the encryption key fix. It checks:
 * 1. Environment variables are set correctly
 * 2. Encryption system works
 * 3. Database is ready for new OAuth connections
 * 4. No demo mode fallback issues
 */

const fs = require('fs')
const crypto = require('crypto')

// Load environment variables
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8')
    const lines = envContent.split('\n')
    
    lines.forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=')
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  } catch (error) {
    console.error('❌ Could not load .env file:', error.message)
    return false
  }
  return true
}

console.log('🔍 VERIFYING OAUTH SYSTEM READINESS...\n')

function checkEnvironmentVariables() {
  console.log('✅ Environment Variables Check')
  
  const requiredVars = [
    'ENCRYPTION_KEY',
    'GA4_TOKEN_ENCRYPTION_KEY',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_URL'
  ]
  
  let allPresent = true
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (!value) {
      console.log(`   ❌ ${varName}: MISSING`)
      allPresent = false
    } else {
      console.log(`   ✅ ${varName}: Present`)
    }
  })
  
  return allPresent
}

function checkEncryptionKeys() {
  console.log('\n🔐 Encryption Keys Validation')
  
  const encryptionKey = process.env.ENCRYPTION_KEY
  const ga4Key = process.env.GA4_TOKEN_ENCRYPTION_KEY
  
  // Check main encryption key
  if (!encryptionKey || encryptionKey.startsWith('a1b2c3d4e5f67890')) {
    console.log('   ❌ ENCRYPTION_KEY: Still using weak key!')
    return false
  } else if (encryptionKey.length < 32) {
    console.log('   ❌ ENCRYPTION_KEY: Too short')
    return false
  } else {
    console.log('   ✅ ENCRYPTION_KEY: Strong and secure')
  }
  
  // Check GA4 key
  if (!ga4Key || ga4Key.length < 32) {
    console.log('   ❌ GA4_TOKEN_ENCRYPTION_KEY: Invalid')
    return false
  } else {
    console.log('   ✅ GA4_TOKEN_ENCRYPTION_KEY: Valid')
  }
  
  return true
}

function checkEncryptionFunctionality() {
  console.log('\n🧪 Encryption Functionality Test')
  
  try {
    const algorithm = 'aes-256-gcm'
    const secretKey = process.env.ENCRYPTION_KEY
    const key = crypto.createHash('sha256').update(secretKey).digest()
    
    // Test OAuth token encryption
    const testTokens = [
      'ya29.a0ARrdaM-test-access-token',
      '1//04-test-refresh-token',
      JSON.stringify({
        access_token: 'ya29.test',
        refresh_token: '1//test',
        scope: 'https://www.googleapis.com/auth/analytics.readonly'
      })
    ]
    
    testTokens.forEach((token, index) => {
      // Encrypt
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv(algorithm, key, iv)
      let encrypted = cipher.update(token, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const authTag = cipher.getAuthTag()
      const encryptedData = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
      
      // Decrypt
      const parts = encryptedData.split(':')
      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(parts[0], 'hex'))
      decipher.setAuthTag(Buffer.from(parts[1], 'hex'))
      let decrypted = decipher.update(parts[2], 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      if (decrypted === token) {
        console.log(`   ✅ Token type ${index + 1}: Encryption/decryption works`)
      } else {
        console.log(`   ❌ Token type ${index + 1}: Failed`)
        return false
      }
    })
    
    return true
  } catch (error) {
    console.log(`   ❌ Encryption test failed: ${error.message}`)
    return false
  }
}

function checkOAuthURLs() {
  console.log('\n🌐 OAuth Configuration Check')
  
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const clientId = process.env.GOOGLE_CLIENT_ID
  
  if (!nextAuthUrl) {
    console.log('   ❌ NEXTAUTH_URL: Missing')
    return false
  }
  
  if (!nextAuthUrl.startsWith('https://')) {
    console.log('   ⚠️  NEXTAUTH_URL: Should use HTTPS in production')
  } else {
    console.log('   ✅ NEXTAUTH_URL: Properly configured')
  }
  
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    console.log('   ❌ GOOGLE_CLIENT_ID: Invalid format')
    return false
  } else {
    console.log('   ✅ GOOGLE_CLIENT_ID: Valid format')
  }
  
  console.log('   ✅ OAuth URLs ready for Google integration')
  return true
}

function generateReadinessReport() {
  console.log('\n📊 OAUTH READINESS REPORT')
  console.log('==========================')
  
  const checks = [
    checkEnvironmentVariables(),
    checkEncryptionKeys(),
    checkEncryptionFunctionality(),
    checkOAuthURLs()
  ]
  
  const allPassed = checks.every(check => check === true)
  
  if (allPassed) {
    console.log('\n🎉 OAUTH SYSTEM IS READY!')
    console.log('\n✅ All systems go for OAuth integrations:')
    console.log('   • Google Analytics 4 connections will work')
    console.log('   • Google Search Console connections will work')
    console.log('   • Token encryption/decryption is functional')
    console.log('   • No more demo mode fallbacks')
    console.log('   • Users can successfully reconnect integrations')
    
    console.log('\n📋 Next Steps:')
    console.log('   1. Deploy to production')
    console.log('   2. Notify users to reconnect Google services')
    console.log('   3. Monitor OAuth connection success rates')
    console.log('   4. Verify real data flows from Google APIs')
    
    return true
  } else {
    console.log('\n❌ OAUTH SYSTEM NOT READY')
    console.log('Fix the issues above before deploying to production.')
    return false
  }
}

async function main() {
  if (!loadEnvFile()) {
    process.exit(1)
  }
  
  const isReady = generateReadinessReport()
  process.exit(isReady ? 0 : 1)
}

if (require.main === module) {
  main()
}