import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)
    
    if (!session?.user.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Super Admin required' }, { status: 401 })
    }

    console.log('🔐 Clearing all authentication connections...')
    
    // Clear GA4 connections
    const ga4Result = await prisma.ga4_connections.deleteMany({})
    console.log(`✅ Cleared ${ga4Result.count} GA4 connections`)
    
    // Clear Search Console connections  
    const scResult = await prisma.search_console_connections.deleteMany({})
    console.log(`✅ Cleared ${scResult.count} Search Console connections`)
    
    console.log('🎉 All authentication connections cleared!')
    
    return NextResponse.json({
      success: true,
      message: 'All authentication connections cleared successfully',
      cleared: {
        ga4Connections: ga4Result.count,
        searchConsoleConnections: scResult.count
      }
    })

  } catch (error) {
    console.error('❌ Error clearing authentication connections:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear authentication connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
