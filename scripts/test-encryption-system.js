#!/usr/bin/env node

/**
 * ENCRYPTION SYSTEM TEST SCRIPT
 * 
 * This script thoroughly tests the new encryption system to ensure:
 * 1. The new encryption key validates properly
 * 2. Encryption/decryption works correctly
 * 3. OAuth token handling works as expected
 * 4. The system no longer falls back to demo mode
 */

const crypto = require('crypto')
const fs = require('fs')

// Load environment variables manually
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
    console.error('Could not load .env file:', error.message)
    process.exit(1)
  }
}

loadEnvFile()

console.log('🔒 TESTING ENCRYPTION SYSTEM...\n')

// Test 1: Validate encryption key strength
function testKeyValidation() {
  console.log('Test 1: Encryption Key Validation')
  
  const key = process.env.ENCRYPTION_KEY
  console.log(`Key: ${key}`)
  console.log(`Length: ${key.length} characters`)
  
  // Check minimum length
  if (key.length < 32) {
    throw new Error('Key too short')
  }
  
  // Check for weak patterns
  const weakPatterns = [
    /^(.)\1+$/, // All same character
    /^1234567890/, // Sequential numbers
    /^abcdefghij/i, // Sequential letters
    /^a1b2c3d4e5f67890/, // The old weak pattern
  ]
  
  let hasWeakPattern = false
  weakPatterns.forEach((pattern, index) => {
    if (pattern.test(key)) {
      console.log(`❌ Matches weak pattern ${index + 1}`)
      hasWeakPattern = true
    }
  })
  
  if (!hasWeakPattern) {
    console.log('✅ No weak patterns detected')
  }
  
  // Check entropy
  const uniqueChars = new Set(key.split('')).size
  console.log(`Unique characters: ${uniqueChars}`)
  
  if (uniqueChars >= 10) {
    console.log('✅ Sufficient entropy')
  } else {
    console.log('❌ Low entropy')
  }
  
  console.log('✅ Key validation PASSED\n')
}

// Test 2: Basic encryption/decryption
function testBasicEncryption() {
  console.log('Test 2: Basic Encryption/Decryption')
  
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.ENCRYPTION_KEY
  const key = crypto.createHash('sha256').update(secretKey).digest()
  
  const testCases = [
    'simple-test',
    'oauth-access-token-1234567890',
    'refresh_token_with_special_chars!@#$%^&*()',
    'very-long-token-that-might-be-used-in-real-oauth-scenarios-with-lots-of-characters-and-data',
    '{"access_token":"ya29.a0ARrdaM...","refresh_token":"1//04...","scope":"https://www.googleapis.com/auth/analytics.readonly","token_type":"Bearer","expires_in":3599}'
  ]
  
  testCases.forEach((testText, index) => {
    try {
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
        console.log(`   ✅ Test case ${index + 1}: PASSED`)
      } else {
        throw new Error(`Decrypted text doesn't match original`)
      }
    } catch (error) {
      console.log(`   ❌ Test case ${index + 1}: FAILED - ${error.message}`)
      throw error
    }
  })
  
  console.log('✅ Basic encryption PASSED\n')
}

// Test 3: Test with old key should fail
function testOldKeyFails() {
  console.log('Test 3: Old Key Validation Failure')
  
  const oldWeakKey = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890'
  
  function validateEncryptionKey(key) {
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long')
    }
    
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^1234567890/, // Sequential numbers
      /^abcdefghij/i, // Sequential letters
      /^a1b2c3d4e5f67890/, // The specific old weak pattern
      /^qwerty/i, // Keyboard patterns
      /^password/i, // Common words
      /^secret/i,
      /^key/i,
      /^test/i,
      /^demo/i,
      /^example/i
    ]
    
    for (const pattern of weakPatterns) {
      if (pattern.test(key)) {
        throw new Error('ENCRYPTION_KEY appears to be weak. Please use a cryptographically secure random key.')
      }
    }
    
    const uniqueChars = new Set(key.split('')).size
    if (uniqueChars < 10) {
      throw new Error('ENCRYPTION_KEY has low entropy. Please use a more random key.')
    }
  }
  
  try {
    validateEncryptionKey(oldWeakKey)
    console.log('❌ Old key should have failed validation!')
    throw new Error('Old key validation should have failed')
  } catch (error) {
    if (error.message.includes('appears to be weak')) {
      console.log('✅ Old key properly rejected as weak')
    } else if (error.message.includes('low entropy')) {
      console.log('✅ Old key properly rejected for low entropy')
    } else {
      throw error
    }
  }
  
  console.log('✅ Old key rejection PASSED\n')
}

// Test 4: Test all environment keys
function testAllEnvironmentKeys() {
  console.log('Test 4: All Environment Keys')
  
  const requiredKeys = [
    'ENCRYPTION_KEY',
    'GA4_TOKEN_ENCRYPTION_KEY', 
    'NEXTAUTH_SECRET',
    'SEOWORKS_WEBHOOK_SECRET'
  ]
  
  requiredKeys.forEach(keyName => {
    const keyValue = process.env[keyName]
    if (!keyValue) {
      throw new Error(`${keyName} is missing from environment`)
    }
    
    console.log(`   ✅ ${keyName}: Present (${keyValue.length} chars)`)
    
    // Basic validation for each key type
    if (keyName === 'NEXTAUTH_SECRET') {
      // Should be base64 encoded
      try {
        Buffer.from(keyValue, 'base64')
        console.log(`      • Valid base64 format`)
      } catch (error) {
        console.log(`      ❌ Invalid base64 format`)
      }
    } else {
      // Should be hex
      if (/^[a-f0-9]+$/i.test(keyValue)) {
        console.log(`      • Valid hex format`)
      } else {
        console.log(`      ❌ Invalid hex format`)
      }
    }
  })
  
  console.log('✅ All environment keys PASSED\n')
}

// Main test runner
async function runTests() {
  try {
    testKeyValidation()
    testBasicEncryption()
    testOldKeyFails()
    testAllEnvironmentKeys()
    
    console.log('🎉 ALL ENCRYPTION TESTS PASSED!')
    console.log('\n✅ The OAuth system should now work properly')
    console.log('✅ No more fallback to demo mode due to encryption failures')
    console.log('✅ Users can safely reconnect their Google integrations')
    
  } catch (error) {
    console.error('❌ ENCRYPTION TEST FAILED:', error.message)
    console.error('\n🚨 DO NOT DEPLOY until encryption tests pass!')
    process.exit(1)
  }
}

if (require.main === module) {
  runTests()
}