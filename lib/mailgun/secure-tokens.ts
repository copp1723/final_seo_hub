import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const TOKEN_EXPIRY_HOURS = 72 // 3 days

interface UnsubscribeToken {
  token: string
  userId: string
  emailType: string
  expiresAt: Date
}

/**
 * Generate a secure unsubscribe token with HMAC signature
 */
export function generateUnsubscribeToken(userId: string, emailType: string): string {
  const secret = process.env.CSRF_SECRET || 'fallback-secret'
  const timestamp = Date.now()
  const data = `${userId}:${emailType}:${timestamp}`
  
  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(data)
  const signature = hmac.digest('hex')
  
  // Create token: base64(data):signature
  const token = Buffer.from(data).toString('base64') + ':' + signature
  return token
}

/**
 * Verify and decode an unsubscribe token
 */
export function verifyUnsubscribeToken(token: string): UnsubscribeToken | null {
  try {
    const [encodedData, signature] = token.split(':')
    if (!encodedData || !signature) return null
    
    // Decode data
    const data = Buffer.from(encodedData, 'base64').toString()
    const [userId, emailType, timestamp] = data.split(':')
    
    if (!userId || !emailType || !timestamp) return null
    
    // Verify signature
    const secret = process.env.CSRF_SECRET || 'fallback-secret'
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex')
    
    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null
    }
    
    // Check expiry
    const tokenTime = parseInt(timestamp)
    const expiresAt = new Date(tokenTime + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000))
    
    if (new Date() > expiresAt) {
      return null
    }
    
    return {
      token,
      userId,
      emailType,
      expiresAt
    }
  } catch (error) {
    return null
  }
}

/**
 * Store unsubscribe token in database for additional security
 */
export async function storeUnsubscribeToken(
  userId: string,
  emailType: string,
  token: string
): Promise<void> {
  // Store in a new UnsubscribeToken table (would need to add to schema)
  // For now, we'll rely on HMAC verification
}

/**
 * Generate unsubscribe URL with secure token
 */
export function generateUnsubscribeUrl(userId: string, emailType: string): string {
  const token = generateUnsubscribeToken(userId, emailType)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}
