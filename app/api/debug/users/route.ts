import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const diagnostics = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    database: 'connected',
    queries: {
      userCount: 0,
      agencyCount: 0,
      accountCount: 0,
      sessionCount: 0
    },
    users: [] as any[],
    agencies: [] as any[],
    accounts: [] as any[],
    errors: [] as string[]
  }

  try {
    console.log('🔍 Starting debug users check...')
    
    // Step 1: Basic connection test
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection verified')

    // Step 2: Get total counts first
    try {
      diagnostics.queries.userCount = await prisma.users.count()
      console.log(`✅ User count: ${diagnostics.queries.userCount}`)
    } catch (userCountError) {
      diagnostics.errors.push(`User count failed: ${(userCountError as Error).message}`)
      console.error('❌ User count failed:', userCountError)
    }

    try {
      diagnostics.queries.agencyCount = await prisma.agencies.count()
      console.log(`✅ Agency count: ${diagnostics.queries.agencyCount}`)
    } catch (agencyCountError) {
      diagnostics.errors.push(`Agency count failed: ${(agencyCountError as Error).message}`)
      console.error('❌ Agency count failed:', agencyCountError)
    }

    try {
      diagnostics.queries.accountCount = await prisma.accounts.count()
      console.log(`✅ Account count: ${diagnostics.queries.accountCount}`)
    } catch (accountCountError) {
      diagnostics.errors.push(`Account count failed: ${(accountCountError as Error).message}`)
      console.error('❌ Account count failed:', accountCountError)
    }

    try {
      diagnostics.queries.sessionCount = await prisma.sessions.count()
      console.log(`✅ Session count: ${diagnostics.queries.sessionCount}`)
    } catch (sessionCountError) {
      diagnostics.errors.push(`Session count failed: ${(sessionCountError as Error).message}`)
      console.error('❌ Session count failed:', sessionCountError)
    }

    // Step 3: Get sample users (simplified query)
    try {
      diagnostics.users = await prisma.users.findMany({
        take: 10,
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      console.log(`✅ Found ${diagnostics.users.length} users`)
    } catch (usersError) {
      diagnostics.errors.push(`Users query failed: ${(usersError as Error).message}`)
      console.error('❌ Users query failed:', usersError)
    }

    // Step 4: Get sample agencies
    try {
      diagnostics.agencies = await prisma.agencies.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          domain: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      console.log(`✅ Found ${diagnostics.agencies.length} agencies`)
    } catch (agenciesError) {
      diagnostics.errors.push(`Agencies query failed: ${(agenciesError as Error).message}`)
      console.error('❌ Agencies query failed:', agenciesError)
    }

    // Step 5: Get sample accounts (simplified)
    try {
      diagnostics.accounts = await prisma.accounts.findMany({
        take: 5,
        select: {
          id: true,
          userId: true,
          provider: true,
          providerAccountId: true
        },
        orderBy: { id: 'desc' }
      })
      console.log(`✅ Found ${diagnostics.accounts.length} accounts`)
    } catch (accountsError) {
      diagnostics.errors.push(`Accounts query failed: ${(accountsError as Error).message}`)
      console.error('❌ Accounts query failed:', accountsError)
    }

    diagnostics.status = diagnostics.errors.length === 0 ? 'success' : 'partial_success'
    
    console.log('\n📊 DEBUG SUMMARY:')
    console.log(`Status: ${diagnostics.status}`)
    console.log(`Total Users: ${diagnostics.queries.userCount}`)
    console.log(`Total Agencies: ${diagnostics.queries.agencyCount}`)
    console.log(`Total Accounts: ${diagnostics.queries.accountCount}`)
    console.log(`Total Sessions: ${diagnostics.queries.sessionCount}`)
    console.log(`Errors: ${diagnostics.errors.length}`)

    return NextResponse.json(diagnostics)

  } catch (error) {
    console.error('❌ Debug users critical error:', error)
    diagnostics.status = 'error'
    diagnostics.errors.push(`Critical error: ${(error as Error).message}`)
    
    return NextResponse.json(diagnostics, { status: 500 })
  }
}
