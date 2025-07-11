import { z } from 'zod'

// Schema for individual dealership row in CSV
export const dealershipCsvRowSchema = z.object({
  name: z.string().min(1, 'Dealership name is required').max(100, 'Name too long'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  ga4PropertyId: z.string().optional().or(z.literal('')),
  searchConsoleUrl: z.string().url('Invalid Search Console URL').optional().or(z.literal(''))
})

// Schema for Mailgun webhook payload
export const mailgunWebhookSchema = z.object({
  signature: z.object({
    timestamp: z.string(),
    token: z.string(),
    signature: z.string()
  }),
  'message-headers': z.string(),
  sender: z.string().email('Invalid sender email'),
  subject: z.string(),
  'attachment-count': z.string().transform(Number),
  attachments: z.record(z.any()).optional()
})

// Type exports
export type DealershipCsvRow = z.infer<typeof dealershipCsvRowSchema>
export type MailgunWebhookPayload = z.infer<typeof mailgunWebhookSchema>

// CSV template for documentation
export const CSV_TEMPLATE = `name,website,ga4PropertyId,searchConsoleUrl
"ABC Motors","https://abcmotors.com","GA4-123456789","https://abcmotors.com"
"XYZ Auto Group","https://xyzauto.com","","https://xyzauto.com"
"Quick Lube Express","","GA4-987654321",""`

// Validation constants
export const CSV_VALIDATION_RULES = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 100,
  ALLOWED_EXTENSIONS: ['.csv'],
  REQUIRED_HEADERS: ['name', 'website', 'ga4PropertyId', 'searchConsoleUrl']
} as const