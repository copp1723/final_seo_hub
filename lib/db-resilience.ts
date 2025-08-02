import { prisma } from './prisma'
import { logger } from './logger'

// Circuit breaker pattern for database operations
class DatabaseCircuitBreaker {
  private static instance: DatabaseCircuitBreaker
  private failureCount = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 30000 // 30 seconds

  static getInstance(): DatabaseCircuitBreaker {
    if (!DatabaseCircuitBreaker.instance) {
      DatabaseCircuitBreaker.instance = new DatabaseCircuitBreaker()
    }
    return DatabaseCircuitBreaker.instance
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Database circuit breaker is open')
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    return this.failureCount >= this.threshold && 
           Date.now() - this.lastFailureTime < this.timeout
  }

  private onSuccess(): void {
    this.failureCount = 0
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    logger.warn('Database circuit breaker failure', { 
      count: this.failureCount 
    })
  }
}

// Wrapper for database operations with retry and circuit breaker
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const circuitBreaker = DatabaseCircuitBreaker.getInstance()
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await circuitBreaker.execute(operation)
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error('Database operation failed after all retries', error)
        throw error
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      logger.warn(`Database operation failed, retrying in ${delay}ms`, {
        attempt,
        maxRetries
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('Unexpected end of retry loop')
}

// Health check for database
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    
    return { healthy: true, latency }
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
