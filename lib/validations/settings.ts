import { z } from 'zod'

// Profile update schema
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
})

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  requestCreated: z.boolean(),
  statusChanged: z.boolean(),
  taskCompleted: z.boolean(),
  weeklySummary: z.boolean(),
  marketingEmails: z.boolean(),
})

// API key operations
export const regenerateApiKeySchema = z.object({
  confirmRegenerate: z.literal(true),
})

// User preferences schema (for general settings)
export const userPreferencesSchema = z.object({
  timezone: z.string().optional(),
  language: z.string().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>