import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Checking database users...')
    
    // Get total user count
    const totalUsers = await prisma.users.count()
    console.log(`Total users in database: ${totalUsers}`)
    
    // Get sample of users (first 5, only email and role for privacy)
    const sampleUsers = await prisma.users.findMany({
      take: 5,
      select: {
        email: true,
        role: true,
        agencyId: true,
        dealershipId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('Sample users:', sampleUsers)
    
    const diagnostics = {
      status: 'success',
      userCount: totalUsers,
      sampleUsers: sampleUsers.map(user => ({
        email: user.email,
        role: user.role,
        hasAgency: !!user.agencyId,
        hasDealership: !!user.dealershipId,
        createdAt: user.createdAt
      })),
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(diagnostics)
    
  } catch (error) {
    console.error('❌ User check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}