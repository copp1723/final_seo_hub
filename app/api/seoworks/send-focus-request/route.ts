import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'

// SEOWorks API configuration
const SEOWORKS_API_KEY = process.env.SEOWORKS_API_KEY

const SEOWORKS_FOCUS_URL = 'https://api.seowerks.ai/rylie-focus.cfm'

interface FocusRequestData {
  requestId: string
  title: string
  description: string
  type: string // page, blog, gbp_post, maintenance
  priority: string
  packageType: string
  targetCities: string[]
  targetModels: string[]
  keywords: string[]
  targetUrl?: string
  clientEmail: string
  businessName?: string
}

async function sendFocusRequestToSEOWorks(data: FocusRequestData) {
  // Transform our request data to Jeff's expected format
  const seoworksPayload = {
    timestamp: new Date().toISOString(),
    requestId: data.requestId,
    requestType: 'focus',
    title: data.title,
    description: data.description,
    taskType: data.type,
    priority: data.priority,
    packageType: data.packageType,
    clientEmail: data.clientEmail,
    businessName: data.businessName || 'Unknown Business',
    targetUrl: data.targetUrl || '',
    // Convert arrays to semicolon-separated strings for Jeff's format
    targetCities: data.targetCities.map(city => {
      // Convert "City, State" back to just "City" for Jeff's format
      return city.split(',')[0].trim()
    }).join(';'),
    targetModels: data.targetModels.join(';'),
    keywords: data.keywords.join(';'),
    // Additional metadata
    submittedAt: new Date().toISOString(),
    source: 'rylie_focus_request'
  }

  try {
    const response = await fetch(SEOWORKS_FOCUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SEOWORKS_API_KEY || ''
      },
      body: JSON.stringify(seoworksPayload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(`SEOWorks API error: ${response.status} - ${JSON.stringify(responseData)}`)
    }

    logger.info('Successfully sent focus request to SEOWorks', {
      requestId: data.requestId,
      title: data.title,
      type: data.type,
      seoworksResponse: responseData
    })

    return {
      success: true,
      seoworksResponse: responseData
    }

  } catch (error) {
    logger.error('Failed to send focus request to SEOWorks', {
      error: error instanceof Error ? error.message : String(error),
      requestId: data.requestId,
      title: data.title,
      payload: seoworksPayload
    })
    throw error
  }
}

// This endpoint is called when a request is created to send it to SEOWorks
export async function POST(request: NextRequest) {
  try {
    logger.info('SEOWorks send-focus-request endpoint called')
    
    const rawBody = await request.text()
    logger.info('SEOWorks send-focus-request raw body', {
      rawBody: rawBody,
      bodyLength: rawBody.length
    })
    
    let parsedBody
    try {
      parsedBody = JSON.parse(rawBody)
    } catch (parseError) {
      logger.error('SEOWorks send-focus-request JSON parse failed', parseError, {
        rawBody: rawBody
      })
      return errorResponse('Invalid JSON in request body', 400)
    }
    
    const { requestId } = parsedBody
    logger.info('SEOWorks send-focus-request parsed data', {
      requestId: requestId,
      hasRequestId: !!requestId,
      requestIdType: typeof requestId
    })
    
    if (!requestId) {
      logger.error('SEOWorks send-focus-request missing requestId', {
        parsedBody: parsedBody,
        requestIdValue: requestId
      })
      return errorResponse('Request ID is required', 400)
    }

    // Fetch the request from database
    const requestData = await prisma.requests.findUnique({
      where: { id: requestId },
      include: { 
        users: true,
        agencies: true
      }
    })

    if (!requestData || !requestData.users) {
      return errorResponse('Request not found', 404)
    }

    logger.info('Sending focus request to SEOWorks', {
      requestId: requestData.id,
      title: requestData.title,
      type: requestData.type,
      userEmail: requestData.users.email
    })

    // Prepare focus request data
    const focusRequestData: FocusRequestData = {
      requestId: requestData.id,
      title: requestData.title,
      description: requestData.description,
      type: requestData.type,
      priority: requestData.priority,
      packageType: requestData.packageType || 'GOLD',
      targetCities: Array.isArray(requestData.targetCities) ? requestData.targetCities as string[] : [],
      targetModels: Array.isArray(requestData.targetModels) ? requestData.targetModels as string[] : [],
      keywords: Array.isArray(requestData.keywords) ? requestData.keywords as string[] : [],
      targetUrl: requestData.targetUrl || undefined,
      clientEmail: requestData.users.email,
      businessName: requestData.agencies?.name || requestData.users.name || undefined
    }

    // Send to SEOWorks
    const seoworksResult = await sendFocusRequestToSEOWorks(focusRequestData)

    // Extract task ID from SEOWorks response if available
    const seoworksTaskId = seoworksResult.seoworksResponse?.taskId || 
                          seoworksResult.seoworksResponse?.id || 
                          seoworksResult.seoworksResponse?.task_id ||
                          null

    // Update request to mark it as sent to SEOWorks and store their task ID
    await prisma.requests.update({
      where: { id: requestData.id },
      data: {
        description: `${requestData.description}\n\n[Sent to SEOWorks at ${new Date().toISOString()}]`,
        status: 'IN_PROGRESS', // Move to in progress since it's now with SEOWorks
        seoworksTaskId: seoworksTaskId // Store Jeff's task ID for webhook matching
      }
    })

    logger.info('Focus request sent to SEOWorks successfully', {
      requestId: requestData.id,
      title: requestData.title,
      userEmail: requestData.users.email
    })

    return successResponse({
      message: 'Focus request sent to SEOWorks successfully',
      requestId: requestData.id,
      title: requestData.title,
      seoworksResponse: seoworksResult.seoworksResponse
    })

  } catch (error) {
    logger.error('Failed to send focus request to SEOWorks', error)
    return errorResponse('Failed to send focus request to SEOWorks', 500)
  }
}
