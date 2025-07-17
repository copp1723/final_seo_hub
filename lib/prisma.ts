import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Parse connection pooling parameters from DATABASE_URL or use defaults
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) return undefined
  
  // Check if pooling params already exist
  if (baseUrl.includes('connection_limit') || baseUrl.includes('pool_timeout')) {
    return baseUrl
  }
  
  // Add connection pooling parameters
  const url = new URL(baseUrl)
  url.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '10')
  url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '30')
  url.searchParams.set('statement_timeout', process.env.DB_STATEMENT_TIMEOUT || '30000')
  url.searchParams.set('connect_timeout', process.env.DB_CONNECT_TIMEOUT || '10')
  
  return url.toString()
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    errorFormat: 'pretty'
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
