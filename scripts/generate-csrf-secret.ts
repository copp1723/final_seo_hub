#!/usr/bin/env tsx
import crypto from 'crypto'

// Generate a secure CSRF secret
const csrfSecret = crypto.randomBytes(32).toString('hex')

console.log('Generated CSRF Secret:')
console.log(csrfSecret)
console.log('\nAdd this to your .env file:')
console.log(`CSRF_SECRET="${csrfSecret}"`)