import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SimpleAuth } from '@/lib/auth-simple'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEPLOYMENT DIAGNOSTICS STARTING...')
    
    // Check environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'SET' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
    }
    
    console.log('Environment Variables Check:', envVars)

    // Test database connection
    let databaseStatus = 'FAILED'
    let userCount = 0
    try {
      await prisma.$queryRaw`SELECT 1`
      userCount = await prisma.users.count()
      databaseStatus = 'SUCCESS'
      console.log('✅ Database connected successfully')
    } catch (error) {
      console.error('❌ Database connection failed:', error)
    }

    // Check dealerships table structure
    let dealershipSchema: any[] = []
    try {
      const columns = await prisma.$queryRaw<any[]>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'dealerships'
        ORDER BY ordinal_position
      `
      dealershipSchema = columns || []
      console.log('Dealerships table schema:', columns)
    } catch (error) {
      console.error('Failed to get dealerships schema:', error)
    }

    // Check if clientId column exists
    let clientIdExists = false
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'dealerships'
        AND column_name = 'clientId'
      `
      clientIdExists = result && result.length > 0
      console.log('clientId column exists:', clientIdExists)
    } catch (error) {
      console.error('Error checking clientId column:', error)
    }

    // Check users and their roles
    let users: any[] = []
    try {
      users = await prisma.users.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          dealershipId: true,
          isSuperAdmin: true
        }
      })
      console.log('✅ Found users:', users.length)
    } catch (error) {
      console.error('Error fetching users:', error)
    }

    // Check dealerships
    let dealerships: any[] = []
    try {
      dealerships = await prisma.dealerships.findMany({
        select: {
          id: true,
          name: true,
          agencyId: true,
          clientId: true
        },
        take: 10
      })
      console.log('✅ Found dealerships:', dealerships.length)
    } catch (error) {
      console.error('Error fetching dealerships:', error)
    }

    // Check sessions
    let sessionCount = 0
    try {
      sessionCount = await prisma.sessions.count()
      console.log('✅ Session count:', sessionCount)
    } catch (error) {
      console.error('Error counting sessions:', error)
    }

    // Check current auth session
    let currentSession = null
    try {
      currentSession = await SimpleAuth.getSessionFromRequest(request)
      console.log('Current session:', currentSession)
    } catch (error) {
      console.error('Error getting current session:', error)
    }

    return NextResponse.json({
      environment: envVars,
      database: databaseStatus,
      userCount,
      sessionCount,
      dealershipSchema,
      clientIdExists,
      users,
      dealerships: dealerships.slice(0, 5), // Limit output
      currentSession,
      errors: []
    })

  } catch (error) {
    console.error('❌ DEPLOYMENT DIAGNOSTICS ERROR:', error)
    return NextResponse.json({
      error: 'Diagnostics failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}