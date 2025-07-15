import type { users } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendEmail } from './client'
import { userInvitationTemplate } from './templates'
import { logger } from '@/lib/logger'

export interface InvitationEmailOptions {
  user: users
  invitedBy: string
  loginUrl?: string
  skipPreferences?: boolean // For new users who don't have preferences yet
}

export async function sendInvitationEmail(options: InvitationEmailOptions): Promise<boolean> {
  const { user, invitedBy, loginUrl, skipPreferences = false } = options

  try {
    // Generate invitation email template
    const emailTemplate = userInvitationTemplate(user, invitedBy, loginUrl)

    // For new users, we skip preference checking since they don't have preferences yet
    if (skipPreferences) {
      const success = await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        tags: ['invitation', 'user-creation']
      })

      if (success) {
        logger.info('Invitation email sent successfully', {
          userId: user.id,
          email: user.email,
          invitedBy
        })
      } else {
        logger.error('Failed to send invitation email', undefined, {
          userId: user.id,
          email: user.email,
          invitedBy
        })
      }

      return success
    }

    // For existing users, check preferences (though this is unlikely for invitations)
    const userWithPreferences = await prisma.users.findUnique({
      where: { id: user.id },
      include: { user_preferences: true }
    })

    if (!userWithPreferences) {
      logger.warn('User not found for invitation email', { userId: user.id })
      return false
    }

    // Check if user has email notifications enabled (default to true for invitations)
    const preferences = userWithPreferences.users.preferences
    const emailNotificationsEnabled = preferences?.emailNotifications ?? true

    if (!emailNotificationsEnabled) {
      logger.info('User has disabled email notifications, skipping invitation', {
        userId: user.id,
        email: user.email
      })
      return false
    }

    const success = await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      tags: ['invitation', 'user-creation']
    })

    if (success) {
      logger.info('Invitation email sent successfully', {
        userId: user.id,
        email: user.email,
        invitedBy
      })
    } else {
      logger.error('Failed to send invitation email', undefined, {
        userId: user.id,
        email: user.email,
        invitedBy
      })
    }

    return success
  } catch (error) {
    logger.error('Error sending invitation email', error, {
      userId: user.id,
      email: user.email,
      invitedBy
    })
    return false
  }
}

// Helper function to create default user preferences for new users
export async function createDefaultUserPreferences(userId: string): Promise<void> {
  try {
    await prisma.users.preferences.create({
      data: {
        userId,
        emailNotifications: true,
        requestCreated: true,
        statusChanged: true,
        taskCompleted: true,
        weeklySummary: true
      }
    })
    
    logger.info('Default user preferences created', { userId })
  } catch (error) {
    // If preferences already exist, that's fine
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      logger.info('User preferences already exist', { userId })
    } else {
      logger.error('Failed to create default user preferences', error, { userId })
    }
  }
}
