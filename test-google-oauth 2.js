#!/usr/bin/env node

// Simple test for Google OAuth configuration
require('dotenv').config({ path: '.env' })

console.log('=== Google OAuth Configuration Test ===\n')

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const NEXTAUTH_URL = process.env.NEXTAUTH_URL

console.log('Environment Variables:')
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : '❌ MISSING')
console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? `${GOOGLE_CLIENT_SECRET.substring(0, 10)}...` : '❌ MISSING')
console.log('NEXTAUTH_URL:', NEXTAUTH_URL || '❌ MISSING')

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXTAUTH_URL) {
  console.log('\n❌ Missing required environment variables!')
  process.exit(1)
}

// Test OAuth URL generation
console.log('\n=== OAuth URL Generation ===')

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/analytics.manage.users'
]

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
authUrl.searchParams.set('redirect_uri', `${NEXTAUTH_URL}/api/ga4/auth/callback`)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPES.join(' '))
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')
authUrl.searchParams.set('state', 'test-user-id')

console.log('✅ OAuth URL generated successfully:')
console.log(authUrl.toString())

console.log('\n=== Manual Test Instructions ===')
console.log('1. Copy the OAuth URL above')
console.log('2. Open it in your browser')
console.log('3. Complete the Google OAuth flow')
console.log('4. Check if you get redirected to your callback URL')
console.log('5. Look for any error messages in the URL parameters')

console.log('\n=== Callback URL ===')
console.log(`Expected callback: ${NEXTAUTH_URL}/api/ga4/auth/callback`)

console.log('\n=== Common Issues ===')
console.log('• Make sure your Google Cloud Console has the correct redirect URI configured')
console.log('• Ensure your OAuth consent screen is properly configured')
console.log('• Check that the Analytics API is enabled in your Google Cloud project')
console.log('• Verify your domain is authorized in the OAuth settings')