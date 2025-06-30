import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { logger } from '@/lib/logger'

// Initialize Mailgun client
const mailgun = new Mailgun(FormData)

// Create Mailgun client instance
export const getMailgunClient = () => {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const region = process.env.MAILGUN_REGION || 'US' // US or EU

  if (!apiKey || !domain) {
    logger.error('Mailgun configuration missing', {
      hasApiKey: !!apiKey,
      hasDomain: !!domain
    })
    throw new Error('Mailgun configuration missing')
  }

  const mg = mailgun.client({
    username: 'api',
    key: apiKey,
    url: region === 'EU' ? 'https://api.eu.mailgun.net' : undefined
  })

  return { mg, domain }
}

// Email sending options
export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: string[]
  variables?: Record<string, any>
  attachments?: Array<{
    filename: string
    data: Buffer | string
    contentType?: string
  }>
}

// Send email function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const { mg, domain } = getMailgunClient()
    
    const messageData = {
      from: options.from || `SEO Hub <noreply@${domain}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      'h:Reply-To': options.replyTo || `support@${domain}`,
      'o:tag': options.tags || ['transactional'],
      'h:X-Mailgun-Variables': JSON.stringify(options.variables || {}),
      attachment: options.attachments
    }

    const result = await mg.messages.create(domain, messageData)
    
    logger.info('Email sent successfully', {
      messageId: result.id,
      to: options.to,
      subject: options.subject
    })

    return true
  } catch (error) {
    logger.error('Failed to send email', error, {
      to: options.to,
      subject: options.subject
    })
    return false
  }
}

// Validate email address
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Get unsubscribe URL
export function getUnsubscribeUrl(userId: string, emailType: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const token = Buffer.from(`${userId}:${emailType}`).toString('base64')
  return `${baseUrl}/api/email/unsubscribe?token=${token}`
}