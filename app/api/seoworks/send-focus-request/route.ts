import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic';

// SEOWorks API configuration
const SEOWORKS_API_KEY = process.env.SEOWORKS_API_KEY

// Endpoint configuration is environment-driven to allow production overrides
// Prefer SEOWORKS_FOCUS_URL; otherwise derive from SEOWORKS_API_URL
const SEOWORKS_BASE_URL = (process.env.SEOWORKS_API_URL || '').replace(/\/+$/, '')
const SEOWORKS_FOCUS_URL = process.env.SEOWORKS_FOCUS_URL || (SEOWORKS_BASE_URL ? `${SEOWORKS_BASE_URL}/rylie-focus.cfm` : '')

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
    // Derive endpoint at runtime so tests that set env after import still work
    const RUNTIME_BASE_URL = (process.env.SEOWORKS_API_URL || '').replace(/\/+$/, '')
    const RUNTIME_FOCUS_URL = process.env.SEOWORKS_FOCUS_URL || (RUNTIME_BASE_URL ? `${RUNTIME_BASE_URL}/rylie-focus.cfm` : '')

    if (!RUNTIME_FOCUS_URL) {
      logger.error('SEOWorks focus URL is not configured', {
        derivedBaseUrl: RUNTIME_BASE_URL,
      })
      throw new Error('SEOWorks focus URL not configured')
    }

    const response = await fetch(RUNTIME_FOCUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SEOWORKS_API_KEY || ''
      },
      body: JSON.stringify(seoworksPayload)
    })

    const contentType = (response as any)?.headers && typeof (response as any).headers.get === 'function'
      ? (response as any).headers.get('content-type') || ''
      : ''
    const rawBody = await response.text()

    let parsedJson: any | null = null
    try {
      parsedJson = JSON.parse(rawBody)
    } catch (_) {
      parsedJson = null
    }

    if (!response.ok) {
      logger.error('SEOWorks API error', {
        status: response.status,
        statusText: response.statusText,
        url: RUNTIME_FOCUS_URL,
        contentType,
        responsePreview: rawBody.slice(0, 500),
        requestId: data.requestId,
        title: data.title,
        payload: seoworksPayload,
      })
      throw new Error(`SEOWorks API error: ${response.status} ${response.statusText} - ${rawBody.slice(0, 300)}`)
    }

    logger.info('Successfully sent focus request to SEOWorks', {
      requestId: data.requestId,
      title: data.title,
      type: data.type,
      status: response.status,
      contentType,
      seoworksResponse: parsedJson ?? rawBody,
      responseIsJson: !!parsedJson
    })

    return {
      success: true,
      seoworksResponse: parsedJson ?? rawBody
    }

  } catch (error) {
    logger.error('Failed to send focus request to SEOWorks', {
      error: error instanceof Error ? error.message : String(error),
      requestId: data.requestId,
      title: data.title,
      focusUrl: RUNTIME_FOCUS_URL,
      derivedBaseUrl: RUNTIME_BASE_URL
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
