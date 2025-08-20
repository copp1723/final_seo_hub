import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'
import { validateEnvironment } from '@/lib/env-validation'

export const dynamic = 'force-dynamic';

// Development-only logging functions
const devLog = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, ...args)
  }
}

const devError = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, ...args)
  }
}

export async function GET() {
  const startTime = Date.now()
  
  // Enhanced diagnostics for deployment debugging
  const envValidation = validateEnvironment()
  
  const diagnostics = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: 0,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      validation: {
        isValid: envValidation.isValid,
        errorCount: envValidation.errors.length,
        warningCount: envValidation.warnings.length,
        missingCount: envValidation.missing.length,
        errors: envValidation.errors,
        warnings: envValidation.warnings,
        missing: envValidation.missing
      },
      variables: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'SET' : 'MISSING',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'MISSING',
        CSRF_SECRET: process.env.CSRF_SECRET ? 'SET' : 'MISSING',
        MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? 'SET' : 'MISSING',
        SEOWORKS_WEBHOOK_SECRET: process.env.SEOWORKS_WEBHOOK_SECRET ? 'SET' : 'MISSING',
      }
    },
    database: {
      connection: 'UNKNOWN',
      userCount: 0,
      agencyCount: 0,
      accountCount: 0,
      sessionCount: 0,
      sampleUsers: [] as any[],
      error: null as string | null
    },
    auth: {
      isProduction: process.env.NODE_ENV === 'production',
      nextAuthUrl: process.env.NEXTAUTH_URL,
      isSecureContext: process.env.NEXTAUTH_URL?.startsWith('https://') || false
    },
    errors: [] as string[]
  }
  
  // Log environment variables (safely) - only in development
  devLog('🔍 DEPLOYMENT DIAGNOSTICS STARTING...')
  devLog('Environment Variables Check:')
  Object.entries(diagnostics.environment).forEach(([key, value]) => {
    devLog(`  ${key}: ${value}`)
  })
  
  // Check environment validation results
  if (!envValidation.isValid) {
    diagnostics.errors.push(...envValidation.errors)
    devError('❌ Environment validation failed:')
    envValidation.errors.forEach(error => devError(`  - ${error}`))
  } else {
    devLog('✅ All environment variables are valid')
  }
  
  if (envValidation.warnings.length > 0) {
    devError('⚠️  Environment warnings:')
    envValidation.warnings.forEach(warning => devError(`  - ${warning}`))
  }
  
  try {
    devLog('🔍 Testing database connection...')
    // Test database connection
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1 as test`
    diagnostics.database.connection = 'SUCCESS'
    devLog('✅ Database connected successfully')
    
    // Get counts
    try {
      diagnostics.database.userCount = await prisma.users.count()
      devLog(`✅ User count: ${diagnostics.database.userCount}`)
    } catch (userError) {
      diagnostics.errors.push(`User count failed: ${getSafeErrorMessage(userError)}`)
      devError('❌ User count failed:', userError)
    }
    
    try {
      diagnostics.database.agencyCount = await prisma.agencies.count()
      devLog(`✅ Agency count: ${diagnostics.database.agencyCount}`)
    } catch (agencyError) {
      diagnostics.errors.push(`Agency count failed: ${getSafeErrorMessage(agencyError)}`)
      devError('❌ Agency count failed:', agencyError)
    }
    
    try {
      diagnostics.database.accountCount = await prisma.accounts.count()
      devLog(`✅ Account count: ${diagnostics.database.accountCount}`)
    } catch (accountError) {
      diagnostics.errors.push(`Account count failed: ${getSafeErrorMessage(accountError)}`)
      devError('❌ Account count failed:', accountError)
    }
    
    try {
      diagnostics.database.sessionCount = await prisma.sessions.count()
      devLog(`✅ Session count: ${diagnostics.database.sessionCount}`)
    } catch (sessionError) {
      diagnostics.errors.push(`Session count failed: ${getSafeErrorMessage(sessionError)}`)
      devError('❌ Session count failed:', sessionError)
    }
    
    // Get sample users to check if any exist
    try {
      diagnostics.database.sampleUsers = await prisma.users.findMany({
        take: 5,
        select: {
          email: true,
          role: true,
          agencyId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      devLog(`✅ Found ${diagnostics.database.sampleUsers.length} sample users`)
      diagnostics.database.sampleUsers.forEach(user => {
        devLog(`  - ${user.email} (${user.role})`)
      })
    } catch (sampleError) {
      diagnostics.errors.push(`Sample users failed: ${getSafeErrorMessage(sampleError)}`)
      devError('❌ Sample users failed:', sampleError)
    }
    
  } catch (error) {
    diagnostics.database.connection = 'FAILED'
    diagnostics.database.error = getSafeErrorMessage(error)
    diagnostics.errors.push(`Database connection failed: ${getSafeErrorMessage(error)}`)
    devError('❌ Database connection failed:', error)
  }
  
  // Check auth configuration
  const { isProduction, nextAuthUrl, isSecureContext } = diagnostics.auth
  if (isProduction && !isSecureContext) {
    diagnostics.errors.push('Production environment but NEXTAUTH_URL is not HTTPS')
    console.warn('⚠️ Production environment detected but NEXTAUTH_URL is not HTTPS')
  }
  
  diagnostics.responseTime = Date.now() - startTime
  diagnostics.status = diagnostics.errors.length === 0 ? 'healthy' : 'unhealthy'
  
  // Final summary
  devLog('\n📊 DIAGNOSTIC SUMMARY:')
  devLog(`Status: ${diagnostics.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`)
  devLog(`Database: ${diagnostics.database.connection}`)
  devLog(`User Count: ${diagnostics.database.userCount}`)
  devLog(`Agency Count: ${diagnostics.database.agencyCount}`)
  devLog(`Account Count: ${diagnostics.database.accountCount}`)
  devLog(`Session Count: ${diagnostics.database.sessionCount}`)
  devLog(`Errors: ${diagnostics.errors.length}`)
  if (diagnostics.errors.length > 0) {
    diagnostics.errors.forEach((error, index) => {
      devLog(`  ${index + 1}. ${error}`)
    })
  }
  
  const statusCode = diagnostics.status === 'healthy' ? 200 : 503
  
  if (diagnostics.status === 'healthy') {
    logger.info('Health check completed successfully', {
      responseTime: diagnostics.responseTime,
      database: diagnostics.database.connection,
      userCount: diagnostics.database.userCount
    })
  } else {
    logger.error('Health check failed', { errors: diagnostics.errors }, {
      path: '/api/health',
      method: 'GET',
      responseTime: diagnostics.responseTime
    })
  }
  
  return NextResponse.json(diagnostics, { status: statusCode })
}
