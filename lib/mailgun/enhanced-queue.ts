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

// In-memory queue since email_queue table doesn't exist in schema
const emailQueue: Map<string, QueuedEmail> = new Map()

// Enhanced email queue with retry logic and delivery tracking
export class EmailQueue {
  private static instance: EmailQueue
  private processing = false
  private readonly maxRetries = 3
  private readonly retryDelays = [2000, 10000, 60000, 300000] // 2s, 10s, 1m, 5m
  private readonly maxBackoffDelay = 900000 // 15 minutes max

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

      // Create queue entry in memory
      const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const queueEntry: QueuedEmail = {
        id,
        userId: email.userId,
        type: email.type,
        to: email.to,
        subject: email.subject,
        html: email.html,
        attempts: 0,
        maxAttempts: this.maxRetries,
        scheduledFor: email.scheduledFor || new Date(),
        createdAt: new Date()
      }
      
      emailQueue.set(id, queueEntry)

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
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    
    const result: QueuedEmail[] = []
    
    for (const [id, email] of emailQueue.entries()) {
      if (result.length >= limit) break
      
      if (email.scheduledFor <= now && 
          email.attempts < email.maxAttempts) {
        result.push(email)
      }
    }
    
    return result.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
  }

  private async processEmail(email: QueuedEmail): Promise<void> {
    try {
      logger.info('Processing queued email', {
        id: email.id,
        to: email.to,
        attempts: email.attempts
      })

      // Update attempt count in memory
      const queuedEmail = emailQueue.get(email.id)
      if (queuedEmail) {
        queuedEmail.attempts += 1
        emailQueue.set(email.id, queuedEmail)
      }

      // Send the email
      await sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html
      })

      // Mark as sent by removing from queue
      emailQueue.delete(email.id)

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
      const queuedEmail = emailQueue.get(email.id)
      if (!queuedEmail || queuedEmail.attempts >= queuedEmail.maxAttempts) {
        emailQueue.delete(email.id)
        logger.error('Email permanently failed', {
          id: email.id,
          to: email.to
        })
      } else {
        // Schedule retry with exponential backoff
        const delay = this.retryDelays[queuedEmail.attempts] || 300000
        const retryAt = new Date(Date.now() + delay)
        
        queuedEmail.scheduledFor = retryAt
        emailQueue.set(email.id, queuedEmail)
        
        logger.info('Email scheduled for retry', {
          id: email.id,
          retryAt,
          attempts: queuedEmail.attempts
        })
      }
    }
  }

  // Clean up old queue entries
  async cleanup(): Promise<void> {
    try {
      const now = new Date()
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours
      let deletedCount = 0
      
      for (const [id, email] of emailQueue.entries()) {
        if (email.createdAt < cutoff && email.attempts >= email.maxAttempts) {
          emailQueue.delete(id)
          deletedCount++
        }
      }
      
      logger.info('Email queue cleanup completed', { deletedRows: deletedCount })
    } catch (error) {
      logger.error('Email queue cleanup failed', error)
    }
  }

  // Get queue statistics
  async getStats(): Promise<any> {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const stats = {
      pending: 0,
      totalAttempts: 0,
      count: 0
    }
    
    for (const [id, email] of emailQueue.entries()) {
      if (email.createdAt > last24h) {
        stats.pending++
        stats.totalAttempts += email.attempts
        stats.count++
      }
    }
    
    return {
      pending: stats.pending,
      avg_attempts: stats.count > 0 ? stats.totalAttempts / stats.count : 0
    }
  }
}