import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NotificationFrequency, NotificationBatch } from '@/lib/types/notification-frequency'
import { emailQueue } from '@/lib/mailgun/queue'
import { getUnsubscribeUrl } from '@/lib/mailgun/client'
import { BrandingConfig, DEFAULT_BRANDING } from '@/lib/branding/config'
import { format } from 'date-fns'

export class NotificationBatchService {
  private static pendingNotifications: Map<string, NotificationBatch> = new Map()

  /**
   * Queue a notification based on user's frequency preference
   */
  static async queueNotification(
    userId: string,
    notificationType: string,
    emailContent: { subject: string; html: string },
    frequency?: NotificationFrequency
  ): Promise<void> {
    try {
      // Get user preferences
      const userPrefs = await prisma.user_preferences.findUnique({
        where: { userId }
      })

      // Determine the frequency for this notification
      const notificationFrequency = frequency || 
        (userPrefs as any)?.[`${notificationType}Frequency`] || 
        NotificationFrequency.INSTANT

      if (notificationFrequency === NotificationFrequency.NEVER) {
        logger.info('Notification skipped due to user preference', { userId, notificationType })
        return
      }

      if (notificationFrequency === NotificationFrequency.INSTANT) {
        // Send immediately
        const user = await prisma.users.findUnique({ where: { id: userId } })
        if (user?.email) {
          await emailQueue.add({
            to: user.email,
            ...emailContent
          })
        }
        return
      }

      // Add to batch for later sending
      const batchKey = `${userId}-${notificationFrequency}`
      let batch = this.pendingNotifications.get(batchKey)

      if (!batch) {
        batch = {
          userId,
          notifications: [],
          scheduledFor: this.getNextScheduledTime(notificationFrequency, userPrefs as any)
        }
        this.pendingNotifications.set(batchKey, batch)
      }

      batch.notifications.push({
        type: notificationType,
        subject: emailContent.subject,
        content: emailContent.html,
        timestamp: new Date()
      })

      logger.info('Notification added to batch', {
        userId,
        notificationType,
        frequency: notificationFrequency,
        batchSize: batch.notifications.length,
        scheduledFor: batch.scheduledFor
      })
    } catch (error) {
      logger.error('Error queuing notification', error, { userId, notificationType })
    }
  }

  /**
   * Process all pending notification batches
   */
  static async processPendingBatches(): Promise<void> {
    const now = new Date()
    const processedBatches: string[] = []

    for (const [batchKey, batch] of this.pendingNotifications.entries()) {
      if (batch.scheduledFor <= now) {
        try {
          await this.sendBatchedNotifications(batch)
          processedBatches.push(batchKey)
        } catch (error) {
          logger.error('Error processing notification batch', error, { batchKey })
        }
      }
    }

    // Remove processed batches
    processedBatches.forEach(key => this.pendingNotifications.delete(key))
  }

  /**
   * Send a batch of notifications as a single digest email
   */
  private static async sendBatchedNotifications(batch: NotificationBatch): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: batch.userId },
      include: { agencies: true }
    })

    if (!user?.email) {
      logger.warn('User not found or no email for batch notifications', { userId: batch.userId })
      return
    }

    const config = user.agencies ? DEFAULT_BRANDING : DEFAULT_BRANDING // Use agency branding if available
    const unsubscribeUrl = getUnsubscribeUrl(user.id, 'digest')

    // Group notifications by type
    const groupedNotifications = batch.notifications.reduce((acc, notif) => {
      if (!acc[notif.type]) acc[notif.type] = []
      acc[notif.type].push(notif)
      return acc
    }, {} as Record<string, typeof batch.notifications>)

    const digestContent = this.generateDigestEmail(user, groupedNotifications, config)

    await emailQueue.add({
      to: user.email,
      subject: digestContent.subject,
      html: digestContent.html
    })

    // Update user's last digest sent time
    await prisma.user_preferences.update({
      where: { userId: user.id },
      data: { updatedAt: new Date() }
    })

    logger.info('Notification digest sent', {
      userId: user.id,
      notificationCount: batch.notifications.length,
      types: Object.keys(groupedNotifications)
    })
  }

  /**
   * Generate digest email HTML
   */
  private static generateDigestEmail(
    user: any,
    groupedNotifications: Record<string, any[]>,
    config: BrandingConfig
  ): { subject: string; html: string } {
    const totalCount = Object.values(groupedNotifications).flat().length
    const subject = `${config.companyName} Digest: ${totalCount} updates`

    const notificationSummary = Object.entries(groupedNotifications)
      .map(([type, notifications]) => {
        const typeDisplay = {
          taskCompleted: '✅ Tasks Completed',
          statusChanged: '🔄 Status Updates',
          requestCreated: '📝 New Requests'
        }[type] || type

        return `
          <div style="margin-bottom: 30px;">
            <h3 style="color: ${config.primaryColor}; font-size: 18px; margin-bottom: 15px;">
              ${typeDisplay} (${notifications.length})
            </h3>
            ${notifications.map(notif => `
              <div style="background-color: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid ${config.primaryColor};">
                <strong style="display: block; margin-bottom: 5px;">${notif.subject}</strong>
                <small style="color: #6c757d;">
                  ${format(new Date(notif.timestamp), 'MMM d, h:mm a')}
                </small>
              </div>
            `).join('')}
          </div>
        `
      }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: ${config.primaryColor}; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; }
    .button { display: inline-block; padding: 12px 24px; background-color: ${config.primaryColor}; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Your ${config.companyName} Activity Digest</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">
        ${format(new Date(), 'MMMM d, yyyy')}
      </p>
    </div>
    <div class="content">
      <p>Hi ${user.name || 'there'},</p>
      <p>Here's a summary of your recent ${config.companyName} activity:</p>
      
      ${notificationSummary}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
          View Full Dashboard
        </a>
      </div>
      
      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        You're receiving this digest because you've set your notification preference to batch updates. 
        You can change this anytime in your settings.
      </p>
    </div>
    <div class="footer">
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications" style="color: #6c757d;">
          Manage Notification Preferences
        </a>
      </p>
    </div>
  </div>
</body>
</html>
    `

    return { subject, html }
  }

  /**
   * Calculate next scheduled time based on frequency
   */
  private static getNextScheduledTime(
    frequency: NotificationFrequency,
    userPrefs?: any
  ): Date {
    const now = new Date()
    const scheduledTime = new Date(now)

    switch (frequency) {
      case NotificationFrequency.DAILY:
        // Next day at specified hour (default 9 AM)
        scheduledTime.setDate(scheduledTime.getDate() + 1)
        scheduledTime.setHours(userPrefs?.digestHour || 9, 0, 0, 0)
        break

      case NotificationFrequency.WEEKLY:
        // Next week on specified day (default Monday)
        const targetDay = userPrefs?.digestDayOfWeek || 1
        const currentDay = scheduledTime.getDay()
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7
        scheduledTime.setDate(scheduledTime.getDate() + daysUntilTarget)
        scheduledTime.setHours(userPrefs?.digestHour || 9, 0, 0, 0)
        break
    }

    return scheduledTime
  }
}