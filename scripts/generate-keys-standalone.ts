#!/usr/bin/env node

/**
 * Standalone script to generate secure encryption keys
 * Usage: npm run generate-keys-standalone
 */

import crypto from 'crypto'

function generateSecureKey(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

console.log('🔐 Generating secure encryption keys...\n')

const keys = {
  ENCRYPTION_KEY: generateSecureKey(32),
  CSRF_SECRET: generateSecureKey(32),
  SEOWORKS_WEBHOOK_SECRET: generateSecureKey(32),
}

console.log('Add these to your .env.local file:\n')
console.log('# Generated secure keys - DO NOT COMMIT')
Object.entries(keys).forEach(([key, value]) => {
  console.log(`${key}=${value}`)
})

console.log('\n# Optional keys (generate as needed):')
console.log(`# SEOWORKS_API_KEY=${generateSecureKey(32)}`)

console.log('\n✅ Keys generated successfully!')
console.log('⚠️  Keep these keys secure and never commit them to version control!')
console.log('\nFor production, set these as environment variables in your hosting platform.')