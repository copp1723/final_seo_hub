#!/usr/bin/env node

/**
 * Test script to diagnose encryption and OAuth issues
 */

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// Test current encryption key
const currentKey = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';

console.log('🔍 OAuth & Encryption Diagnostic Test\n');

// 1. Test Encryption Key Validation
console.log('1️⃣ Testing Encryption Key Validation');
console.log('=' .repeat(50));

function validateEncryptionKey(key) {
  const weakPatterns = [
    { pattern: /^(.)\1+$/, name: 'All same character' },
    { pattern: /^1234567890/, name: 'Sequential numbers' },
    { pattern: /^abcdefghij/i, name: 'Sequential letters' },
    { pattern: /^qwerty/i, name: 'Keyboard pattern' },
    { pattern: /^password/i, name: 'Contains "password"' },
    { pattern: /^secret/i, name: 'Contains "secret"' },
    { pattern: /^test/i, name: 'Contains "test"' },
    { pattern: /^demo/i, name: 'Contains "demo"' }
  ];

  console.log(`Testing key: ${key.substring(0, 20)}...`);
  console.log(`Key length: ${key.length} characters`);

  // Check length
  if (key.length < 32) {
    console.log('❌ FAIL: Key too short (minimum 32 characters)');
    return false;
  }

  // Check weak patterns
  for (const { pattern, name } of weakPatterns) {
    if (pattern.test(key)) {
      console.log(`❌ FAIL: Weak pattern detected - ${name}`);
      return false;
    }
  }

  // Check entropy
  const uniqueChars = new Set(key.split('')).size;
  console.log(`Unique characters: ${uniqueChars}`);
  if (uniqueChars < 10) {
    console.log('❌ FAIL: Low entropy (need at least 10 unique characters)');
    return false;
  }

  console.log('✅ PASS: Key validation successful');
  return true;
}

const isValid = validateEncryptionKey(currentKey);
console.log(`\nCurrent key status: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

// 2. Test Encryption/Decryption
console.log('\n2️⃣ Testing Encryption/Decryption');
console.log('=' .repeat(50));

function testEncryption(key) {
  try {
    const algorithm = 'aes-256-gcm';
    const keyHash = crypto.createHash('sha256').update(key).digest();
    
    // Test data
    const testToken = 'ya29.a0AfH6SMBxxxxxx_test_oauth_token';
    
    // Encrypt
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
    let encrypted = cipher.update(testToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    const encryptedData = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    
    console.log('✅ Encryption successful');
    console.log(`   Encrypted length: ${encryptedData.length} characters`);
    
    // Decrypt
    const parts = encryptedData.split(':');
    const decIv = Buffer.from(parts[0], 'hex');
    const decAuthTag = Buffer.from(parts[1], 'hex');
    const decEncrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, keyHash, decIv);
    decipher.setAuthTag(decAuthTag);
    let decrypted = decipher.update(decEncrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('✅ Decryption successful');
    console.log(`   Decrypted matches: ${decrypted === testToken}`);
    
    return true;
  } catch (error) {
    console.log('❌ Encryption/Decryption FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

if (isValid) {
  testEncryption(currentKey);
} else {
  console.log('⚠️  Skipping encryption test - key is invalid');
}

// 3. Test Database Connections
console.log('\n3️⃣ Checking Database OAuth Connections');
console.log('=' .repeat(50));

async function checkDatabaseConnections() {
  const prisma = new PrismaClient();
  
  try {
    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        propertyId: true,
        propertyName: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
        createdAt: true
      }
    });
    
    console.log(`\nFound ${ga4Connections.length} GA4 connection(s)`);
    
    for (const conn of ga4Connections) {
      console.log(`\n🔗 Connection ${conn.id}:`);
      console.log(`   User ID: ${conn.userId}`);
      console.log(`   Dealership ID: ${conn.dealershipId || 'Not set'}`);
      console.log(`   Property ID: ${conn.propertyId || 'Not set'}`);
      console.log(`   Property Name: ${conn.propertyName || 'Not set'}`);
      console.log(`   Has Access Token: ${!!conn.accessToken}`);
      console.log(`   Has Refresh Token: ${!!conn.refreshToken}`);
      
      // Check if tokens are encrypted
      if (conn.accessToken) {
        const isEncrypted = conn.accessToken.includes(':') && conn.accessToken.split(':').length === 3;
        console.log(`   Token Format: ${isEncrypted ? 'Encrypted' : 'Plain text or invalid'}`);
      }
      
      // Check expiration
      if (conn.expiresAt) {
        const isExpired = new Date() > conn.expiresAt;
        console.log(`   Token Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      }
    }
    
    // Check Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        siteUrl: true,
        accessToken: true,
        refreshToken: true
      }
    });
    
    console.log(`\n\nFound ${scConnections.length} Search Console connection(s)`);
    
    for (const conn of scConnections) {
      console.log(`\n🔗 Connection ${conn.id}:`);
      console.log(`   User ID: ${conn.userId}`);
      console.log(`   Dealership ID: ${conn.dealershipId || 'Not set'}`);
      console.log(`   Site URL: ${conn.siteUrl || 'Not set'}`);
      console.log(`   Has Access Token: ${!!conn.accessToken}`);
      console.log(`   Has Refresh Token: ${!!conn.refreshToken}`);
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 4. Generate New Secure Key
console.log('\n4️⃣ Generating New Secure Encryption Key');
console.log('=' .repeat(50));

const newKey = crypto.randomBytes(32).toString('hex');
console.log(`\n✅ New secure key generated:`);
console.log(`   ${newKey}`);
console.log(`\n📋 To fix the system:`);
console.log(`   1. Update .env file: ENCRYPTION_KEY=${newKey}`);
console.log(`   2. Update Render environment variable`);
console.log(`   3. Restart the application`);
console.log(`   4. Users will need to reconnect their OAuth accounts`);

// Run database check
checkDatabaseConnections().then(() => {
  console.log('\n\n🏁 Diagnostic test complete');
  
  if (!isValid) {
    console.log('\n⚠️  CRITICAL: The encryption key is invalid!');
    console.log('   The system cannot decrypt OAuth tokens.');
    console.log('   This is why you see demo data instead of real data.');
  }
});