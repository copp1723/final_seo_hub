import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'

export async function GET() {
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response
  
  try {
    const requests = await prisma.request.findMany({
      where: { userId: authResult.user.id },
      orderBy: { createdAt: 'desc' },
    })
    
    return successResponse({ requests })
  } catch (error) {
    console.error('Error fetching requests:', error)
    return errorResponse('Failed to fetch requests', 500)
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.authenticated) return authResult.response
  
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.description || !body.type) {
      return errorResponse('Missing required fields')
    }
    
    const newRequest = await prisma.request.create({
      data: {
        userId: authResult.user.id,
        agencyId: authResult.user.agencyId,
        title: body.title,
        description: body.description,
        type: body.type,
        priority: body.priority || 'medium',
        status: 'pending',
        packageType: body.packageType,
        keywords: body.keywords || [],
        targetUrl: body.targetUrl,
      },
    })
    
    return successResponse({ request: newRequest }, 'Request created successfully')
  } catch (error) {
    console.error('Error creating request:', error)
    return errorResponse('Failed to create request', 500)
  }
}