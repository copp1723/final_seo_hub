import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test basic connection
    await prisma.$connect()
    
    // Test dealerships count
    const dealershipCount = await prisma.dealerships.count()
    
    // Test users count
    const userCount = await prisma.users.count()
    
    // Get sample data
    const sampleDealerships = await prisma.dealerships.findMany({
      select: { id: true, name: true, agencyId: true, clientId: true },
      take: 3
    })
    
    return NextResponse.json({
      status: 'connected',
      dealershipCount,
      userCount,
      sampleDealerships,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}