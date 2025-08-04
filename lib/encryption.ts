import crypto from 'crypto'

const algorithm = 'aes-256-gcm'
const secretKey = process.env.ENCRYPTION_KEY

// Validate encryption key
function validateEncryptionKey(key: string | undefined): void {
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  
  // Check minimum length (should be at least 32 characters for good entropy)
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long')
  }
  
  // Check for weak patterns
  const weakPatterns = [
    /^(.)\1+$/, // All same character
    /^1234567890/, // Sequential numbers
    /^abcdefghij/i, // Sequential letters
    /^a1b2c3d4e5f67890/, // Specific weak pattern that was used
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
      throw new Error('ENCRYPTION_KEY appears to be weak.Please use a cryptographically secure random key.')
    }
  }
  
  // Check entropy (basic check for character variety)
  const uniqueChars = new Set(key.split('')).size
  if (uniqueChars < 10) {
    throw new Error('ENCRYPTION_KEY has low entropy.Please use a more random key.')
  }
}

// Validate on startup
validateEncryptionKey(secretKey)

// Ensure key is exactly 32 bytes using SHA-256
const key = crypto.createHash('sha256').update(secretKey!).digest()

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate a cryptographically secure encryption key
 */
export function generateSecureKey(length: number = 64): string {
  return crypto.randomBytes(length / 2).toString('hex')
}

/**
 * Generate all required encryption keys for the application
 */
export function generateAllKeys(): Record<string, string> {
  return {
    ENCRYPTION_KEY: generateSecureKey(64),
    GA4_TOKEN_ENCRYPTION_KEY: generateSecureKey(64),
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString('base64'),
    SEOWORKS_WEBHOOK_SECRET: generateSecureKey(64)
  }
}
