import { EmailOptions } from './client'
import { emailQueue } from './queue'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { NotificationBatchService } from '@/lib/services/notification-batch-service'
import { NotificationFrequency } from '@/lib/types/notification-frequency'

/**
 * Enhanced email queue function that respects user notification frequency preferences
 */
export async function queueEmailWithFrequency(
  userId: string,
  emailType: 'requestCreated' | 'statusChanged' | 'taskCompleted' | 'weeklySummary' | 'invitation',
  emailOptions: EmailOptions
): Promise<boolean> {
  try {
    // Get user with preferences
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { user_preferences: true }
    })

    if (!user || !user.email) {
      logger.warn('User not found or no email', { userId })
      return false
    }

    // Check if user has opted in for this type of email
    const preferences = user.user_preferences
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

    // Get frequency preference for this email type
    const frequencyField = `${emailType}Frequency` as keyof typeof preferences
    const frequency = (preferences[frequencyField] as NotificationFrequency) || 
                     (preferences as any).notificationFrequency || 
                     NotificationFrequency.INSTANT

    // For invitation and weekly summary, always send instantly
    if (emailType === 'invitation' || emailType === 'weeklySummary') {
      await emailQueue.add({ ...emailOptions, to: user.email })
      return true
    }

    // Handle based on frequency preference
    if (frequency === NotificationFrequency.INSTANT) {
      // Send immediately
      await emailQueue.add({ ...emailOptions, to: user.email })
      logger.info('Email queued for instant delivery', { userId, emailType })
      return true
    } else if (frequency === NotificationFrequency.NEVER) {
      // Don't send
      logger.info('Email skipped due to NEVER frequency', { userId, emailType })
      return false
    } else {
      // Add to batch for later delivery
      await NotificationBatchService.queueNotification(
        userId,
        emailType,
        {
          subject: emailOptions.subject,
          html: emailOptions.html
        },
        frequency
      )
      logger.info('Email added to batch for delayed delivery', { 
        userId, 
        emailType, 
        frequency 
      })
      return true
    }
  } catch (error) {
    logger.error('Error queuing email with frequency', error, { userId, emailType })
    return false
  }
}