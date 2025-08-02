import { NextRequest } from 'next/server'
import { NotificationBatchService } from '@/lib/services/notification-batch-service'
import { logger } from '@/lib/logger'
import { successResponse, errorResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401)
    }

    logger.info('Starting notification batch processing')

    // Process all pending notification batches
    await NotificationBatchService.processPendingBatches()

    logger.info('Notification batch processing completed')

    return successResponse({
      message: 'Notification batches processed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error processing notification batches', error)
    return errorResponse('Failed to process notification batches', 500)
  }
}

// Allow manual trigger for testing
export async function POST(request: NextRequest) {
  return GET(request)
}