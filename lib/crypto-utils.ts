import crypto from 'crypto'

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  )
}

/**
 * Generates a secure random token
 * @param bytes Number of random bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Hashes a token using SHA-256
 * @param token The token to hash
 * @returns Hex-encoded hash
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}