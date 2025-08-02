export enum NotificationFrequency {
  INSTANT = 'INSTANT',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  NEVER = 'NEVER'
}

export interface NotificationBatch {
  userId: string
  notifications: Array<{
    type: string
    subject: string
    content: string
    timestamp: Date
    metadata?: Record<string, any>
  }>
  scheduledFor: Date
}

export interface UserNotificationSettings {
  userId: string
  emailNotifications: boolean
  frequency: NotificationFrequency
  taskCompletedFrequency?: NotificationFrequency
  statusChangedFrequency?: NotificationFrequency
  lastDigestSent?: Date
  digestHour?: number // 0-23, hour to send daily digests
  digestDayOfWeek?: number // 0-6, day to send weekly digests (0 = Sunday)
}