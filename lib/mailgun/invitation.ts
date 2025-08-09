import { userInvitationTemplate, UserInvitationData, getEmailBranding } from './templates'
import { logger } from '@/lib/logger'

interface MailgunConfig {
  apiKey: string
  domain: string
  region: 'US' | 'EU'
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
  from?: string
}

function getMailgunConfig(): MailgunConfig {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const region = (process.env.MAILGUN_REGION || 'US') as 'US' | 'EU'

  if (!apiKey || !domain) {
    throw new Error('Mailgun configuration missing. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.')
  }

  return { apiKey, domain, region }
}

function getMailgunApiUrl(region: 'US' | 'EU', domain: string): string {
  const baseUrl = region === 'EU' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
  return `${baseUrl}/v3/${domain}/messages`
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const config = getMailgunConfig()
    const apiUrl = getMailgunApiUrl(config.region, config.domain)
    
    const formData = new FormData()
    formData.append('from', options.from || `noreply@${config.domain}`)
    formData.append('to', options.to)
    formData.append('subject', options.subject)
    formData.append('html', options.html)
    formData.append('text', options.text)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Mailgun API error', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      })
      return false
    }

    const result = await response.json()
    logger.info('Email sent successfully', { 
      messageId: result.id,
      to: options.to 
    })
    
    return true
  } catch (error) {
    logger.error('Failed to send email', error, { to: options.to })
    return false
  }
}

export interface SendInvitationEmailOptions {
  user: {
    id: string
    email: string
    name: string
    role: string
    agencyId?: string | null
    onboardingCompleted?: boolean
  }
  invitedBy: string
  loginUrl: string
  skipPreferences?: boolean
  request?: Request
}

export async function sendInvitationEmail(options: SendInvitationEmailOptions): Promise<boolean> {
  try {
    // Get branding based on request context
    const branding = getEmailBranding(options.request)
    
    // Prepare template data
    const templateData: UserInvitationData = {
      user: options.user,
      invitedBy: options.invitedBy,
      loginUrl: options.loginUrl,
      branding
    }

    // Generate email content
    const emailContent = userInvitationTemplate(templateData)
    
    // Send the email
    const success = await sendEmail({
      to: options.user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      from: `${branding.companyName} <noreply@${getMailgunConfig().domain}>`
    })

    if (success) {
      logger.info('Invitation email sent', {
        userId: options.user.id,
        email: options.user.email,
        role: options.user.role,
        invitedBy: options.invitedBy,
        companyName: branding.companyName
      })
    }

    return success
  } catch (error) {
    logger.error('Failed to send invitation email', error, {
      userId: options.user.id,
      email: options.user.email
    })
    return false
  }
}

// Helper function for testing email templates
export function generateInvitationEmailPreview(options: SendInvitationEmailOptions): string {
  const branding = getEmailBranding(options.request)
  const templateData: UserInvitationData = {
    user: options.user,
    invitedBy: options.invitedBy,
    loginUrl: options.loginUrl,
    branding
  }
  
  const emailContent = userInvitationTemplate(templateData)
  return emailContent.html
}
