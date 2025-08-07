import { NextRequest } from 'next/server'
import { CsvSecurityService } from '@/lib/services/csv-security'
import { CsvDealershipProcessor } from '@/lib/services/csv-dealership-processor'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/mailgun/client'
import { errorResponse, successResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic';

/**
 * Send error notification email to the sender
 */
async function sendErrorEmail(to: string, subject: string, message: string): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: `Dealership CSV Error: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">CSV Processing Error</h2>
          <p style="font-size: 16px; line-height: 1.5;">${message}</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Expected CSV Format:</h3>
            <pre style="background-color: #e9ecef; padding: 10px; border-radius: 3px; overflow-x: auto;">name,website,ga4PropertyId,searchConsoleUrl
"ABC Motors","https://abcmotors.com","GA4-123456789","https://abcmotors.com"
"XYZ Auto Group","https://xyzauto.com","","https://xyzauto.com"</pre>
          </div>
          
          <p style="font-size: 14px; color: #6c757d;">
            Please check your CSV file format and try again.If you continue to have issues, contact support</p>
          
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            This is an automated message from the SEO Hub system</p>
        </div>
      `,
      tags: ['csv-error', 'dealership-onboarding']
    })
  } catch (error) {
    logger.error('Failed to send error email', error, { to, subject })
  }
}

/**
 * Send success notification email with processing results
 */
async function sendSuccessEmail(to: string, result: any, agencyName: string): Promise<void> {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Dealership CSV Processing Complete</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          Your CSV file has been processed successfully for <strong>${agencyName}</strong>.
        </p>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Summary:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Total rows:</strong> ${result.totalRows}</li>
            <li><strong>Successfully created:</strong> ${result.successfulRows}</li>
            <li><strong>Failed:</strong> ${result.failedRows}</li>
          </ul>
        </div>

        ${result.createdDealerships.length > 0 ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Created Dealerships:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${result.createdDealerships.map((d: any) => `<li>${d.name}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${result.errors.length > 0 ? `
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #721c24; margin-top: 0;">Errors:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${result.errors.map((e: any) => `<li><strong>Row ${e.row}:</strong> ${e.error}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #6c757d;">
          This is an automated message from the SEO Hub system</p>
      </div>
    `

    await sendEmail({
      to,
      subject: `Dealership CSV Processing Complete - ${result.successfulRows} created`,
      html,
      tags: ['csv-success', 'dealership-onboarding']
    })
  } catch (error) {
    logger.error('Failed to send success email', error, { to })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    logger.info('Received Mailgun webhook for dealership CSV processing', {
      url: url.pathname,
      method: request.method
    })

    // Verify Mailgun signature for security
    // Mailgun may send headers with different casing or in form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      logger.error('Failed to parse form data from Mailgun webhook', error)
      return errorResponse('Invalid form data', 400)
    }
    
    // Try to get signature from headers first, then from form data
    const signature = request.headers.get('x-mailgun-signature') || 
                     request.headers.get('X-Mailgun-Signature') ||
                     formData.get('signature') as string
    const timestamp = request.headers.get('x-mailgun-timestamp') || 
                     request.headers.get('X-Mailgun-Timestamp') ||
                     formData.get('timestamp') as string
    const token = request.headers.get('x-mailgun-token') || 
                 request.headers.get('X-Mailgun-Token') ||
                 formData.get('token') as string

    // Skip signature verification in development mode if explicitly disabled
    const skipVerification = process.env.NODE_ENV === 'development' && 
                           process.env.SKIP_MAILGUN_VERIFICATION === 'true'
    
    if (!skipVerification) {
      if (!signature || !timestamp || !token) {
        logger.warn('Missing Mailgun signature headers')
        return errorResponse('Missing Mailgun signature headers', 400)
      }

      if (!CsvSecurityService.verifyMailgunSignature(timestamp, token, signature)) {
        logger.warn('Invalid Mailgun signature')
        return errorResponse('Invalid Mailgun signature', 401)
      }
    } else {
      logger.warn('Skipping Mailgun signature verification in development mode')
    }

    // Get email details from form data
    const sender = formData.get('sender') as string
    const subject = formData.get('subject') as string
    const attachmentCount = parseInt(formData.get('attachment-count') as string || '0')
    const eventType = formData.get('event') as string

    logger.info('Processing email from sender', {
      sender,
      subject,
      attachmentCount,
      eventType,
      formDataKeys: Array.from(formData.keys())
    })

    // Check if this is actually a dealership CSV processing request
    // If there's no sender or it's not an inbound email, this might be a different webhook
    if (!sender || eventType !== 'stored') {
      logger.info('Webhook is not for dealership CSV processing', {
        sender,
        eventType,
        subject
      })
      return successResponse({
        message: 'Webhook received but not for dealership CSV processing',
        eventType,
        sender
      })
    }

    // Additional check: if this is an invitation email being sent out (not received),
    // it shouldn't be processed by this webhook
    if (subject && subject.toLowerCase().includes('invitation') ||
        subject && subject.toLowerCase().includes('welcome')) {
      logger.info('Ignoring outbound invitation email webhook', {
        sender,
        subject,
        eventType
      })
      return successResponse({
        message: 'Ignoring outbound invitation email',
        subject
      })
    }

    // Check rate limiting
    if (CsvSecurityService.isRateLimited(sender)) {
      await sendErrorEmail(sender, 'Rate limit exceeded', 'You have exceeded the maximum number of CSV processing requests per hour. Please try again later.')
      return errorResponse('Rate limit exceeded', 429)
    }

    // Validate sender authorization
    const senderValidation = await CsvSecurityService.validateSender(sender)
    if (!senderValidation.isValid || !senderValidation.user || !senderValidation.agency) {
      logger.warn('Unauthorized sender attempted CSV upload', { sender, error: senderValidation.error })
      await sendErrorEmail(sender, 'Unauthorized sender', senderValidation.error || 'You are not authorized to create dealerships via email.')
      return errorResponse('Unauthorized sender', 403)
    }

    // Check for CSV attachment
    if (attachmentCount === 0) {
      await sendErrorEmail(sender, 'No attachment found', 'Please attach a CSV file with dealership data.')
      return errorResponse('No attachment found', 400)
    }

    // Find and process first CSV attachment
    let csvFile: File | null = null
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attachment-') && value instanceof File && value.name.toLowerCase().endsWith('.csv')) {
        csvFile = value
        break
      }
    }

    if (!csvFile) {
      await sendErrorEmail(sender, 'No CSV file found', 'Please attach a valid CSV file with the.csv extension.')
      return errorResponse('No CSV file found', 400)
    }

    // Validate file safety and format
    const fileBuffer = Buffer.from(await csvFile.arrayBuffer())
    const fileValidation = CsvSecurityService.validateCsvFile(csvFile.name, fileBuffer)
    if (!fileValidation.isValid) {
      logger.warn('Invalid CSV file uploaded', { sender, fileName: csvFile.name, error: fileValidation.error })
      await sendErrorEmail(sender, 'Invalid file', fileValidation.error!)
      return errorResponse(fileValidation.error!, 400)
    }

    // Validate CSV headers
    const headerValidation = CsvDealershipProcessor.validateCsvHeaders(fileBuffer)
    if (!headerValidation.isValid) {
      logger.warn('Invalid CSV headers', { sender, fileName: csvFile.name, error: headerValidation.error })
      await sendErrorEmail(sender, 'Invalid CSV format', headerValidation.error!)
      return errorResponse(headerValidation.error!, 400)
    }

    // Create processing log
    const processingId = await CsvDealershipProcessor.createProcessingLog(
      sender,
      senderValidation.agency?.id,
      csvFile.name,
      fileBuffer.length
    )

    logger.info('Created processing log', { processingId, sender, agencyId: senderValidation.agency?.id })

    // Process CSV asynchronously to avoid timeout
    setImmediate(async () => {
      try {
        logger.info('Starting async CSV processing', { processingId })
        
        const result = await CsvDealershipProcessor.processCsv(
          fileBuffer,
          senderValidation.agency!.id,
          processingId
        )

        await sendSuccessEmail(sender, result, senderValidation.agency!.name)
        
        logger.info('CSV processing completed successfully', {
          processingId,
          successfulRows: result.successfulRows,
          failedRows: result.failedRows
        })
      } catch (error) {
        logger.error('Async CSV processing failed', error, {
          processingId,
          sender,
          agencyId: senderValidation.agency?.id
        })
        await sendErrorEmail(sender, 'Processing failed', 'An error occurred while processing your CSV file.Please check the format and try again.')
      }
    })

    return successResponse({
      message: 'CSV file received and queued for processing',
      processingId,
      agency: senderValidation.agency?.name
    })

  } catch (error: any) {
    logger.error('Mailgun webhook error', error, {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      errorMessage: error?.message,
      errorStack: error?.stack
    })
    return errorResponse(`Internal server error: ${error?.message || 'Unknown error'}`, 500)
  }
}


/**
 * GET endpoint for webhook testing
 */
export async function GET(request: NextRequest) {
  return successResponse({
    message: 'Dealership CSV webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}
