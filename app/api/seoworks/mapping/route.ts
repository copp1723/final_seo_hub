import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for creating task mappings
const createMappingSchema = z.object({
  requestId: z.string().min(1),
  seoworksTaskId: z.string().min(1),
  taskType: z.string().min(1),
  metadata: z.record(z.any()).optional()
})

// Timing-safe comparison for API key
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// Verify webhook authentication
function verifyAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.SEOWORKS_WEBHOOK_SECRET
  
  if (!apiKey || !expectedKey) {
    return false
  }
  
  return timingSafeCompare(apiKey, expectedKey)
}

// POST endpoint for creating SEOWorks task mappings
export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    logger.warn('Mapping API request with invalid auth', {
      path: request.url
    })
    return errorResponse('Unauthorized', 401)
  }

  try {
    const body = await request.json()
    const validation = createMappingSchema.safeParse(body)
    
    if (!validation.success) {
      logger.warn('Invalid mapping payload', {
        error: validation.error.errors
      })
      return errorResponse('Invalid request payload', 400)
    }

    const { requestId, seoworksTaskId, taskType, metadata } = validation.data

    // Check if request exists
    const requestRecord = await prisma.request.findUnique({
      where: { id: requestId },
      include: { user: true }
    })

    if (!requestRecord) {
      return errorResponse('Request not found', 404)
    }

    // Check if mapping already exists
    const existingMapping = await prisma.sEOWorksTaskMapping.findUnique({
      where: { seoworksTaskId }
    })

    if (existingMapping) {
      return errorResponse('SEOWorks task ID already mapped', 409)
    }

    // Create the mapping
    const mapping = await prisma.sEOWorksTaskMapping.create({
      data: {
        requestId,
        seoworksTaskId,
        taskType,
        metadata: metadata || {},
        status: 'active'
      }
    })

    // Optionally update the request with the SEOWorks task ID
    await prisma.request.update({
      where: { id: requestId },
      data: { seoworksTaskId }
    })

    logger.info('SEOWorks task mapping created', {
      mappingId: mapping.id,
      requestId,
      seoworksTaskId,
      taskType
    })

    return successResponse({
      success: true,
      message: 'Task mapping created successfully',
      mapping: {
        id: mapping.id,
        requestId,
        seoworksTaskId,
        taskType,
        status: mapping.status
      },
      request: {
        id: requestRecord.id,
        title: requestRecord.title,
        clientId: requestRecord.userId,
        clientEmail: requestRecord.user.email
      }
    })
  } catch (error) {
    logger.error('Error creating task mapping', error)
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}

// GET endpoint for retrieving mappings
export async function GET(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    const seoworksTaskId = searchParams.get('seoworksTaskId')

    if (!requestId && !seoworksTaskId) {
      return errorResponse('Either requestId or seoworksTaskId parameter is required', 400)
    }

    let mapping = null

    if (seoworksTaskId) {
      mapping = await prisma.sEOWorksTaskMapping.findUnique({
        where: { seoworksTaskId },
        include: {
          request: {
            include: { user: true }
          }
        }
      })
    } else if (requestId) {
      mapping = await prisma.sEOWorksTaskMapping.findFirst({
        where: { requestId },
        include: {
          request: {
            include: { user: true }
          }
        }
      })
    }

    if (!mapping) {
      return errorResponse('Mapping not found', 404)
    }

    return successResponse({
      success: true,
      mapping: {
        id: mapping.id,
        requestId: mapping.requestId,
        seoworksTaskId: mapping.seoworksTaskId,
        taskType: mapping.taskType,
        status: mapping.status,
        metadata: mapping.metadata,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt
      },
      request: {
        id: mapping.request.id,
        title: mapping.request.title,
        status: mapping.request.status,
        clientId: mapping.request.userId,
        clientEmail: mapping.request.user.email
      }
    })
  } catch (error) {
    logger.error('Error retrieving task mapping', error)
    return errorResponse(getSafeErrorMessage(error), 500)
  }
}