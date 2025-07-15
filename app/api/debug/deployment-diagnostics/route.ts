import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
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
      migrationStatus: 'UNKNOWN'
    },
    auth: {
      configuration: 'UNKNOWN',
      cookieSettings: 'UNKNOWN'
    },
    errors: [] as string[]
  }

  // Test 1: Database Connection
  try {
    console.log('🔍 Testing database connection...')
    await prisma.$connect()
    
    // Test basic query
    const userCount = await prisma.users.count()
    diagnostics.database.connection = 'SUCCESS'
    diagnostics.database.userCount = userCount
    console.log(`✅ Database connected successfully. User count: ${userCount}`)
    
    // Test if basic schema exists
    try {
      const agencyCount = await prisma.agencies.count()
      diagnostics.database.migrationStatus = 'SCHEMA_EXISTS'
      console.log(`✅ Schema exists. Agency count: ${agencyCount}`)
    } catch (schemaError) {
      diagnostics.database.migrationStatus = 'SCHEMA_MISSING'
      diagnostics.errors.push(`Schema issue: ${(schemaError as Error).message}`)
      console.error('❌ Schema missing or incomplete:', schemaError)
    }
    
  } catch (dbError) {
    diagnostics.database.connection = 'FAILED'
    diagnostics.errors.push(`Database connection failed: ${(dbError as Error).message}`)
    console.error('❌ Database connection failed:', dbError)
  }

  // Test 2: Environment Variables Detail Check
  const missingEnvVars = []
  const envChecks = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
  }

  for (const [key, value] of Object.entries(envChecks)) {
    if (!value) {
      missingEnvVars.push(key)
    }
  }

  if (missingEnvVars.length > 0) {
    diagnostics.errors.push(`Missing environment variables: ${missingEnvVars.join(', ')}`)
    console.error('❌ Missing environment variables:', missingEnvVars)
  } else {
    console.log('✅ All required environment variables are set')
  }

  // Test 3: NextAuth Configuration
  try {
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const isProduction = process.env.NODE_ENV === 'production'
    const isSecureContext = nextAuthUrl?.startsWith('https://')
    
    diagnostics.auth.configuration = 'CONFIGURED'
    diagnostics.auth.cookieSettings = `Production: ${isProduction}, Secure: ${isSecureContext}`
    
    console.log('🔍 Auth configuration:', {
      isProduction,
      nextAuthUrl,
      isSecureContext,
      useSecureCookies: isProduction && isSecureContext
    })
    
    if (isProduction && !isSecureContext) {
      diagnostics.errors.push('Production environment but NEXTAUTH_URL is not HTTPS')
      console.warn('⚠️ Production environment but NEXTAUTH_URL is not HTTPS')
    }
    
  } catch (authError) {
    diagnostics.auth.configuration = 'ERROR'
    diagnostics.errors.push(`Auth configuration error: ${(authError as Error).message}`)
    console.error('❌ Auth configuration error:', authError)
  }

  // Test 4: Prisma Client Status
  try {
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Prisma client working correctly')
  } catch (prismaError) {
    diagnostics.errors.push(`Prisma client error: ${(prismaError as Error).message}`)
    console.error('❌ Prisma client error:', prismaError)
  }

  // Summary
  const hasErrors = diagnostics.errors.length > 0
  console.log('\n📊 DIAGNOSTIC SUMMARY:')
  console.log(`Status: ${hasErrors ? '❌ ISSUES FOUND' : '✅ ALL CHECKS PASSED'}`)
  console.log(`Errors: ${diagnostics.errors.length}`)
  if (hasErrors) {
    diagnostics.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`)
    })
  }

  return NextResponse.json({
    status: hasErrors ? 'ERROR' : 'SUCCESS',
    summary: hasErrors ? 'Configuration issues detected' : 'All systems operational',
    ...diagnostics
  }, {
    status: hasErrors ? 500 : 200
  })
}