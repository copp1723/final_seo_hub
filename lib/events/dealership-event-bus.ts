import { logger } from '@/lib/logger'
import { analyticsCoordinator } from '@/lib/analytics/analytics-coordinator'

export interface DealershipChangeEvent {
  userId: string
  previousDealershipId?: string
  newDealershipId?: string
  timestamp: Date
}

type EventHandler = (event: DealershipChangeEvent) => void | Promise<void>

/**
 * Event bus for coordinating dealership context changes
 * Ensures all services react consistently to dealership switches
 */
export class DealershipEventBus {
  private static instance: DealershipEventBus
  private handlers: EventHandler[] = []
  private processingQueue: Promise<void>[] = []

  private constructor() {
    // Register default handlers
    this.registerDefaultHandlers()
  }

  static getInstance(): DealershipEventBus {
    if (!DealershipEventBus.instance) {
      DealershipEventBus.instance = new DealershipEventBus()
    }
    return DealershipEventBus.instance
  }

  /**
   * Register an event handler
   */
  on(handler: EventHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Remove an event handler
   */
  off(handler: EventHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler)
  }

  /**
   * Emit a dealership change event
   */
  async emit(event: DealershipChangeEvent): Promise<void> {
    logger.info('Dealership change event emitted', {
      userId: event.userId,
      from: event.previousDealershipId,
      to: event.newDealershipId
    })

    // Process all handlers in parallel
    const promises = this.handlers.map(async handler => {
      try {
        await handler(event)
      } catch (error) {
        logger.error('Event handler error', error, {
          handler: handler.name,
          userId: event.userId,
          previousDealershipId: event.previousDealershipId,
          newDealershipId: event.newDealershipId
        })
      }
    })

    // Track processing for coordination
    const processingPromise = Promise.all(promises).then(() => {
      logger.info('All dealership change handlers completed', {
        handlerCount: this.handlers.length,
        userId: event.userId
      })
    })

    this.processingQueue.push(processingPromise)

    // Cleanup old promises
    this.processingQueue = this.processingQueue.filter(p => 
      p !== processingPromise
    )

    await processingPromise
  }

  /**
   * Wait for all pending events to complete
   */
  async waitForPendingEvents(): Promise<void> {
    await Promise.all(this.processingQueue)
  }

  /**
   * Register default event handlers
   */
  private registerDefaultHandlers(): void {
    // Cache invalidation handler
    this.on(async (event) => {
      logger.info('Invalidating cache for dealership change', {
        userId: event.userId,
        previousDealershipId: event.previousDealershipId,
        newDealershipId: event.newDealershipId
      })

      // Use analytics coordinator for cache invalidation (now uses Redis)
      await analyticsCoordinator.invalidateDealershipCache(event.userId, event.previousDealershipId)

      // Also invalidate for new dealership to ensure consistency
      if (event.newDealershipId) {
        await analyticsCoordinator.invalidateDealershipCache(event.userId, event.newDealershipId)
      }
    })

    // Cache pre-warming handler
    this.on(async (event) => {
      if (event.newDealershipId) {
        logger.info('Pre-warming cache for new dealership', {
          userId: event.userId,
          dealershipId: event.newDealershipId
        })

        // Pre-warm cache in background (don't await)
        analyticsCoordinator.prewarmCache(
          event.userId,
          event.newDealershipId
        ).catch(error => {
          logger.error('Cache pre-warm failed', error)
        })
      }
    })

    // Metrics tracking handler
    this.on(async (event) => {
      try {
        // Track dealership switches for analytics
        const metrics = {
          event: 'dealership_switch',
          userId: event.userId,
          from: event.previousDealershipId || 'none',
          to: event.newDealershipId || 'none',
          timestamp: event.timestamp.toISOString()
        }

        logger.info('Dealership switch tracked', metrics)
      } catch (error) {
        logger.error('Failed to track dealership switch', error)
      }
    })
  }

  /**
   * Create and emit a dealership change event
   */
  static async notifyDealershipChange(
    userId: string,
    previousDealershipId?: string,
    newDealershipId?: string
  ): Promise<void> {
    const event: DealershipChangeEvent = {
      userId,
      previousDealershipId,
      newDealershipId,
      timestamp: new Date()
    }

    await DealershipEventBus.getInstance().emit(event)
  }
}

// Export singleton instance
export const dealershipEventBus = DealershipEventBus.getInstance()