import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, getSafeErrorMessage } from '@/lib/logger'

export async function GET() {
  const startTime = Date.now()
  
  // Enhanced diagnostics for deployment debugging
  const diagnostics = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: 0,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'SET' : 'MISSING',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
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
  
  // Log environment variables (safely)
  console.log('🔍 DEPLOYMENT DIAGNOSTICS STARTING...')
  console.log('Environment Variables Check:')
  Object.entries(diagnostics.environment).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
  
  // Check for missing environment variables
  const missingEnvVars = Object.entries(diagnostics.environment)
    .filter(([key, value]) => value === 'MISSING')
    .map(([key]) => key)
  
  if (missingEnvVars.length > 0) {
    diagnostics.errors.push(`Missing environment variables: ${missingEnvVars.join(', ')}`)
    console.error('❌ Missing environment variables:', missingEnvVars)
  } else {
    console.log('✅ All required environment variables are set')
  }
  
  try {
    console.log('🔍 Testing database connection...')
    // Test database connection
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1 as test`
    diagnostics.database.connection = 'SUCCESS'
    console.log('✅ Database connected successfully')
    
    // Get counts
    try {
      diagnostics.database.userCount = await prisma.users.count()
      console.log(`✅ User count: ${diagnostics.database.userCount}`)
    } catch (userError) {
      diagnostics.errors.push(`User count failed: ${getSafeErrorMessage(userError)}`)
      console.error('❌ User count failed:', userError)
    }
    
    try {
      diagnostics.database.agencyCount = await prisma.agencies.count()
      console.log(`✅ Agency count: ${diagnostics.database.agencyCount}`)
    } catch (agencyError) {
      diagnostics.errors.push(`Agency count failed: ${getSafeErrorMessage(agencyError)}`)
      console.error('❌ Agency count failed:', agencyError)
    }
    
    try {
      diagnostics.database.accountCount = await prisma.accounts.count()
      console.log(`✅ Account count: ${diagnostics.database.accountCount}`)
    } catch (accountError) {
      diagnostics.errors.push(`Account count failed: ${getSafeErrorMessage(accountError)}`)
      console.error('❌ Account count failed:', accountError)
    }
    
    try {
      diagnostics.database.sessionCount = await prisma.sessions.count()
      console.log(`✅ Session count: ${diagnostics.database.sessionCount}`)
    } catch (sessionError) {
      diagnostics.errors.push(`Session count failed: ${getSafeErrorMessage(sessionError)}`)
      console.error('❌ Session count failed:', sessionError)
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
      console.log(`✅ Found ${diagnostics.database.sampleUsers.length} sample users`)
      diagnostics.database.sampleUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`)
      })
    } catch (sampleError) {
      diagnostics.errors.push(`Sample users failed: ${getSafeErrorMessage(sampleError)}`)
      console.error('❌ Sample users failed:', sampleError)
    }
    
  } catch (error) {
    diagnostics.database.connection = 'FAILED'
    diagnostics.database.error = getSafeErrorMessage(error)
    diagnostics.errors.push(`Database connection failed: ${getSafeErrorMessage(error)}`)
    console.error('❌ Database connection failed:', error)
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
  console.log('\n📊 DIAGNOSTIC SUMMARY:')
  console.log(`Status: ${diagnostics.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`)
  console.log(`Database: ${diagnostics.database.connection}`)
  console.log(`User Count: ${diagnostics.database.userCount}`)
  console.log(`Agency Count: ${diagnostics.database.agencyCount}`)
  console.log(`Account Count: ${diagnostics.database.accountCount}`)
  console.log(`Session Count: ${diagnostics.database.sessionCount}`)
  console.log(`Errors: ${diagnostics.errors.length}`)
  if (diagnostics.errors.length > 0) {
    diagnostics.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`)
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
