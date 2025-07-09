import { sendEmail, EmailOptions } from './client'
import { logger } from '@/lib/logger'

// Simple in-memory queue for email sending
// In production, consider using a proper queue like Redis/Bull
class EmailQueue {
  private queue: Array<{ email: EmailOptions; retries: number }> = []
  private processing = false
  private maxRetries = 3
  private retryDelay = 5000 // 5 seconds
  private failedEmails: Array<{ email: EmailOptions; retries: number; timestamp: Date }> = []

  constructor() {
    this.validateEmailConfig()
  }

  private validateEmailConfig(): void {
    const required = ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'NEXT_PUBLIC_APP_URL']
    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      logger.error('❌ Missing email configuration', { missing })
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
    
    logger.info('✅ Email configuration validated')
  }

  async add(email: EmailOptions): Promise<void> {
    // Log email attempt for debugging
    logger.info('Adding email to queue', {
      to: email.to,
      subject: email.subject,
      queueSize: this.queue.length
    })
    
    this.queue.push({ email, retries: 0 })
    
    // Start processing if not already running
    if (!this.processing) {
      this.process()
    }
  }

  private async process(): Promise<void> {
    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) continue

      try {
        const success = await sendEmail(item.email)
        
        if (!success && item.retries < this.maxRetries) {
          // Retry with exponential backoff
          item.retries++
          const delay = this.retryDelay * Math.pow(2, item.retries - 1)
          
          logger.warn(`Email send failed, retrying in ${delay}ms`, {
            to: item.email.to,
            subject: item.email.subject,
            retries: item.retries
          })

          setTimeout(() => {
            this.queue.push(item)
            if (!this.processing) {
              this.process()
            }
          }, delay)
        } else if (!success) {
          // Store failed email for debugging
          this.failedEmails.push({
            email: item.email,
            retries: item.retries,
            timestamp: new Date()
          })
          
          logger.error('Email send failed after max retries', undefined, {
            to: item.email.to,
            subject: item.email.subject,
            retries: item.retries
          })
        }
      } catch (error) {
        logger.error('Unexpected error in email queue', error, {
          to: item.email.to,
          subject: item.email.subject
        })
      }
    }

    this.processing = false
  }

  // Get queue size
  getSize(): number {
    return this.queue.length
  }

  // Clear the queue (useful for testing)
  clear(): void {
    this.queue = []
  }

  // Get failed emails for debugging
  getFailedEmails(): Array<{ email: EmailOptions; retries: number; timestamp: Date }> {
    return this.failedEmails
  }

  // Clear failed emails
  clearFailedEmails(): void {
    this.failedEmails = []
  }
}

// Create singleton instance
export const emailQueue = new EmailQueue()

// Helper function to queue emails with user preference checking
import { prisma } from '@/lib/prisma'

export async function queueEmailWithPreferences(
  userId: string,
  emailType: 'requestCreated' | 'statusChanged' | 'taskCompleted' | 'weeklySummary' | 'invitation',
  emailOptions: EmailOptions
): Promise<boolean> {
  try {
    // Get user with preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true }
    })

    if (!user || !user.email) {
      logger.warn('User not found or no email', { userId })
      return false
    }

    // Check if user has opted in for this type of email
    const preferences = user.preferences
    if (!preferences || !preferences.emailNotifications) {
      logger.info('User has disabled email notifications', { userId, emailType })
      return false
    }

    // Check specific email type preference
    const emailTypePreference = preferences[emailType as keyof typeof preferences]
    if (emailTypePreference === false) {
      logger.info('User has disabled this email type', { userId, emailType })
      return false
    }

    // Add to queue
    await emailQueue.add({
      ...emailOptions,
      to: user.email
    })

    return true
  } catch (error) {
    logger.error('Error queuing email with preferences', error, { userId, emailType })
    return false
  }
}