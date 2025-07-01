import Redis from 'ioredis'
import { logger } from './logger'

export interface RedisClient {
  set(key: string, value: string): Promise<'OK' | null>
  get(key: string): Promise<string | null>
  del(key: string): Promise<number>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
  exists(key: string): Promise<number>
  setex(key: string, seconds: number, value: string): Promise<'OK'>
  ping(): Promise<string>
}

class RedisManager {
  private client: Redis | null = null
  private isConnected = false
  private connectionAttempted = false

  constructor() {
    this.initializeClient()
  }

  private initializeClient() {
    if (!process.env.REDIS_URL || this.connectionAttempted) {
      return
    }

    this.connectionAttempted = true

    try {
      this.client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      })

      this.client.on('connect', () => {
        this.isConnected = true
        logger.info('Redis connected successfully')
      })

      this.client.on('error', (error) => {
        this.isConnected = false
        logger.warn('Redis connection error, falling back to in-memory storage', { error: error.message })
      })

      this.client.on('close', () => {
        this.isConnected = false
        logger.warn('Redis connection closed')
      })

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...')
      })

    } catch (error) {
      logger.warn('Failed to initialize Redis client', { error: error instanceof Error ? error.message : String(error) })
      this.client = null
    }
  }

  async getClient(): Promise<RedisClient | null> {
    if (!this.client) {
      return null
    }

    if (!this.isConnected) {
      try {
        await this.client.connect()
        this.isConnected = true
      } catch (error) {
        logger.warn('Failed to connect to Redis', { error: error instanceof Error ? error.message : String(error) })
        return null
      }
    }

    return this.client as RedisClient
  }

  async isAvailable(): Promise<boolean> {
    const client = await this.getClient()
    if (!client) return false

    try {
      await client.ping()
      return true
    } catch (error) {
      logger.warn('Redis ping failed', { error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
      this.isConnected = false
    }
  }
}

// Singleton instance
const redisManager = new RedisManager()

export { redisManager }
export default redisManager