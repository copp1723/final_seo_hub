import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { sendEmail } from './client'

interface QueuedEmail {
  id: string
  userId: string
  type: string
  to: string
  subject: string
  html: string
  attempts: number
  maxAttempts: number
  scheduledFor: Date
  createdAt: Date
}

// Enhanced email queue with retry logic and delivery tracking
export class EmailQueue {
  private static instance: EmailQueue
  private processing = false
  private readonly maxRetries = 3
  private readonly retryDelays = [5000, 30000, 300000] // 5s, 30s, 5m

  static getInstance(): EmailQueue {
    if (!EmailQueue.instance) {
      EmailQueue.instance = new EmailQueue()
    }
    return EmailQueue.instance
  }

  async queueEmail(email: {
    userId: string
    type: string
    to: string
    subject: string
    html: string
    scheduledFor?: Date
  }): Promise<string> {
    try {
      // Check user preferences first
      const userPrefs = await prisma.user_preferences.findUnique({
        where: { userId: email.userId }
      })

      // Skip if user has disabled this notification type
      if (userPrefs && !this.shouldSendNotification(email.type, userPrefs)) {
        logger.info('Email skipped due to user preferences', {
          userId: email.userId,
          type: email.type
        })
        return 'skipped'
      }

      // Create queue entry
      const queueEntry = await prisma.$executeRaw`
        INSERT INTO email_queue (
          id, user_id, type, recipient, subject, html_content, 
          attempts, max_attempts, scheduled_for, created_at
        ) VALUES (
          gen_random_uuid(), ${email.userId}, ${email.type}, ${email.to},
          ${email.subject}, ${email.html}, 0, ${this.maxRetries},
          ${email.scheduledFor || new Date()}, NOW()
        ) RETURNING id
      `

      logger.info('Email queued successfully', {
        userId: email.userId,
        type: email.type,
        to: email.to
      })

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue()
      }

      return 'queued'
    } catch (error) {
      logger.error('Failed to queue email', error, {
        userId: email.userId,
        type: email.type
      })
      throw error
    }
  }

  private shouldSendNotification(type: string, prefs: any): boolean {
    const typeMap: Record<string, keyof typeof prefs> = {
      'taskCompleted': 'taskCompleted',
      'statusChanged': 'statusChanged',
      'requestCreated': 'requestCreated',
      'weeklySummary': 'weeklySummary'
    }

    const prefKey = typeMap[type]
    return prefKey ? prefs[prefKey] : prefs.emailNotifications
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return
    
    this.processing = true
    logger.info('Starting email queue processing')

    try {
      while (true) {
        // Get next batch of emails to send
        const emails = await this.getNextEmails(10)
        
        if (emails.length === 0) {
          break
        }

        // Process emails concurrently
        await Promise.allSettled(
          emails.map(email => this.processEmail(email))
        )

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      logger.error('Email queue processing error', error)
    } finally {
      this.processing = false
      logger.info('Email queue processing completed')
    }
  }

  private async getNextEmails(limit: number): Promise<QueuedEmail[]> {
    const result = await prisma.$queryRaw<QueuedEmail[]>`
      SELECT * FROM email_queue 
      WHERE scheduled_for <= NOW() 
        AND attempts < max_attempts
        AND (last_attempt_at IS NULL OR last_attempt_at < NOW() - INTERVAL '5 minutes')
      ORDER BY scheduled_for ASC 
      LIMIT ${limit}
    `
    return result
  }

  private async processEmail(email: QueuedEmail): Promise<void> {
    try {
      logger.info('Processing queued email', {
        id: email.id,
        to: email.to,
        attempts: email.attempts
      })

      // Update attempt count
      await prisma.$executeRaw`
        UPDATE email_queue 
        SET attempts = attempts + 1, last_attempt_at = NOW()
        WHERE id = ${email.id}
      `

      // Send the email
      await sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html
      })

      // Mark as sent
      await prisma.$executeRaw`
        UPDATE email_queue 
        SET status = 'sent', sent_at = NOW()
        WHERE id = ${email.id}
      `

      logger.info('Email sent successfully', {
        id: email.id,
        to: email.to
      })

    } catch (error) {
      logger.error('Failed to send email', error, {
        id: email.id,
        to: email.to,
        attempts: email.attempts
      })

      // Check if we should retry
      if (email.attempts >= email.maxAttempts) {
        await prisma.$executeRaw`
          UPDATE email_queue 
          SET status = 'failed', failed_at = NOW()
          WHERE id = ${email.id}
        `
        logger.error('Email permanently failed', {
          id: email.id,
          to: email.to
        })
      } else {
        // Schedule retry with exponential backoff
        const delay = this.retryDelays[email.attempts] || 300000
        const retryAt = new Date(Date.now() + delay)
        
        await prisma.$executeRaw`
          UPDATE email_queue 
          SET scheduled_for = ${retryAt}
          WHERE id = ${email.id}
        `
        
        logger.info('Email scheduled for retry', {
          id: email.id,
          retryAt,
          attempts: email.attempts + 1
        })
      }
    }
  }

  // Clean up old queue entries
  async cleanup(): Promise<void> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM email_queue 
        WHERE (status = 'sent' AND sent_at < NOW() - INTERVAL '7 days')
           OR (status = 'failed' AND failed_at < NOW() - INTERVAL '30 days')
      `
      
      logger.info('Email queue cleanup completed', { deletedRows: result })
    } catch (error) {
      logger.error('Email queue cleanup failed', error)
    }
  }

  // Get queue statistics
  async getStats(): Promise<any> {
    const stats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(attempts) as avg_attempts
      FROM email_queue 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
    `
    
    return stats
  }
}