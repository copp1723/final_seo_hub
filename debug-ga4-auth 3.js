#!/usr/bin/env node

// Debug script to test GA4 authentication setup
require('dotenv').config({ path: '.env' })

console.log('=== GA4 Authentication Debug ===\n')

// Check environment variables
console.log('1. Environment Variables:')
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing')
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '✗ Missing')
console.log('GA4_TOKEN_ENCRYPTION_KEY:', process.env.GA4_TOKEN_ENCRYPTION_KEY ? '✓ Set' : '✗ Missing')
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? '✓ Set' : '✗ Missing')

// Test OAuth URL generation
if (process.env.GOOGLE_CLIENT_ID && process.env.NEXTAUTH_URL) {
  console.log('\n2. OAuth URL Test:')
  const SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics',
    'https://www.googleapis.com/auth/analytics.edit',
    'https://www.googleapis.com/auth/analytics.manage.users'
  ]

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES.join(' '))
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', 'test-user-id')

  console.log('Generated OAuth URL:')
  console.log(authUrl.toString())
  console.log('\n✓ OAuth URL generation successful')
} else {
  console.log('\n2. OAuth URL Test: ✗ Skipped (missing env vars)')
}

// Test database connection
console.log('\n3. Database Connection Test:')
try {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  
  prisma.$connect().then(() => {
    console.log('✓ Database connection successful')
    
    // Test GA4 connections table
    return prisma.ga4_connections.findMany({ take: 1 })
  }).then((connections) => {
    console.log('✓ GA4 connections table accessible')
    console.log(`Found ${connections.length} existing connections`)
    
    return prisma.$disconnect()
  }).catch((error) => {
    console.log('✗ Database error:', error.message)
  })
} catch (error) {
  console.log('✗ Database setup error:', error.message)
}

// Test encryption
console.log('\n4. Encryption Test:')
try {
  const crypto = require('crypto')
  const key = process.env.ENCRYPTION_KEY || process.env.GA4_TOKEN_ENCRYPTION_KEY
  
  if (key && key.length === 64) {
    const testData = 'test-token-12345'
    const cipher = crypto.createCipher('aes-256-cbc', key)
    let encrypted = cipher.update(testData, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    if (decrypted === testData) {
      console.log('✓ Encryption/decryption working')
    } else {
      console.log('✗ Encryption test failed - data mismatch')
    }
  } else {
    console.log('✗ Invalid encryption key length (should be 64 chars)')
  }
} catch (error) {
  console.log('✗ Encryption test error:', error.message)
}

console.log('\n=== Debug Complete ===')
console.log('\nNext Steps:')
console.log('1. Fix any missing environment variables')
console.log('2. Test the OAuth flow by visiting: /api/ga4/auth/connect')
console.log('3. Check browser console for any JavaScript errors')
console.log('4. Monitor server logs during authentication')