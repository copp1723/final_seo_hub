#!/usr/bin/env node

/**
 * Script to generate secure encryption keys for the application
 * Usage: npm run generate-keys
 */

import { generateAllKeys, generateSecureKey } from '../lib/encryption'

console.log('🔐 Generating secure encryption keys...\n')

const keys = generateAllKeys()

console.log('Add these to your .env file:\n')
console.log('# Generated secure keys')
Object.entries(keys).forEach(([key, value]) => {
  console.log(`${key}=${value}`)
})

console.log('\n# Optional keys (generate as needed):')
console.log(`# SEOWORKS_API_KEY=${generateSecureKey(32)}`)

console.log('\n✅ Keys generated successfully!')
console.log('⚠️  Keep these keys secure and never commit them to version control!')
console.log('\nFor production, set these as environment variables in your hosting platform.')