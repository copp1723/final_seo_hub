import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { users, agencies } from '@prisma/client'
import { CSV_VALIDATION_RULES } from '@/lib/validations/dealership-csv'

export interface SenderValidationResult {
  isValid: boolean
  user?: users & { agencies: agencies | null }
  agency?: agencies
  error?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

export class CsvSecurityService {
  /**
   * Verify Mailgun webhook signature for security
   */
  static verifyMailgunSignature(
    timestamp: string,
    token: string,
    signature: string
  ): boolean {
    try {
      const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
      if (!key) {
        logger.error('Missing MAILGUN_WEBHOOK_SIGNING_KEY environment variable')
        return false
      }

      const encodedToken = crypto
        .createHmac('sha256', key)
        .update(timestamp.concat(token))
        .digest('hex')
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(encodedToken, 'hex')
      )
    } catch (error) {
      logger.error('Error verifying Mailgun signature', error)
      return false
    }
  }

  /**
   * Validate that the sender is authorized to create dealerships
   */
  static async validateSender(email: string): Promise<SenderValidationResult> {
    try {
      const user = await prisma.users.findUnique({
        where: { email },
        include: { agencies: true }
      })

      if (!user) {
        return { 
          isValid: false, 
          error: 'User not found in system' 
        }
      }

      if (!user.agencies) {
        return { 
          isValid: false, 
          error: 'User is not associated with an agency' 
        }
      }

      // Only allow AGENCY_ADMIN and SUPER_ADMIN roles
      const allowedRoles = ['AGENCY_ADMIN', 'SUPER_ADMIN']
      if (!allowedRoles.includes(user.role)) {
        return { 
          isValid: false, 
          error: `Insufficient permissions.Required: ${allowedRoles.join(' or ')}` 
        }
      }

      return {
        isValid: true,
        user,
        agency: user.agencies
      }
    } catch (error) {
      logger.error('Error validating sender', error, { email })
      return { 
        isValid: false, 
        error: 'Database error during validation' 
      }
    }
  }

  /**
   * Validate CSV file for safety and format compliance
   */
  static validateCsvFile(
    filename: string,
    content: Buffer,
    maxSize: number = CSV_VALIDATION_RULES.MAX_FILE_SIZE
  ): FileValidationResult {
    try {
      // Check file extension
      const hasValidExtension = CSV_VALIDATION_RULES.ALLOWED_EXTENSIONS.some(
        ext => filename.toLowerCase().endsWith(ext)
      )
      
      if (!hasValidExtension) {
        return { 
          isValid: false, 
          error: `Only ${CSV_VALIDATION_RULES.ALLOWED_EXTENSIONS.join(', ')} files are allowed` 
        }
      }

      // Check file size
      if (content.length > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024))
        return { 
          isValid: false, 
          error: `File size exceeds ${maxSizeMB}MB limit` 
        }
      }

      // Check for empty file
      if (content.length === 0) {
        return { 
          isValid: false, 
          error: 'File is empty' 
        }
      }

      // Check for malicious content patterns in first 1KB
      const contentStr = content.toString('utf8', 0, Math.min(1024, content.length))
      const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
        /vbscript:/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
      ]

      for (const pattern of maliciousPatterns) {
        if (pattern.test(contentStr)) {
          return { 
            isValid: false, 
            error: 'File contains potentially malicious content' 
          }
        }
      }

      // Basic CSV format validation - check for header row
      const lines = contentStr.split('\n')
      if (lines.length < 2) {
        return { 
          isValid: false, 
          error: 'CSV must contain at least a header row and one data row' 
        }
      }

      // Validate required headers are present
      const headerLine = lines[0].toLowerCase()
      const missingHeaders = CSV_VALIDATION_RULES.REQUIRED_HEADERS.filter(
        header => !headerLine.includes(header.toLowerCase())
      )

      if (missingHeaders.length > 0) {
        return { 
          isValid: false, 
          error: `Missing required headers: ${missingHeaders.join(', ')}` 
        }
      }

      return { isValid: true }
    } catch (error) {
      logger.error('Error validating CSV file', error, { filename })
      return { 
        isValid: false, 
        error: 'Error validating file format' 
      }
    }
  }

  /**
   * Rate limiting for email-based requests
   */
  private static attempts = new Map<string, number[]>()
  
  static isRateLimited(
    email: string, 
    maxAttempts: number = 5, 
    windowMs: number = 3600000 // 1 hour
  ): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(email) || []
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < windowMs)
    
    if (recentAttempts.length >= maxAttempts) {
      logger.warn('Rate limit exceeded for email', { email, attempts: recentAttempts.length })
      return true
    }
    
    // Add current attempt
    recentAttempts.push(now)
    this.attempts.set(email, recentAttempts)
    return false
  }

  /**
   * Clean up old rate limiting data (call periodically)
   */
  static cleanupRateLimitData(): void {
    const now = Date.now()
    const oneHour = 3600000
    
    for (const [email, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(time => now - time < oneHour)
      if (recentAttempts.length === 0) {
        this.attempts.delete(email)
      } else {
        this.attempts.set(email, recentAttempts)
      }
    }
  }
}
