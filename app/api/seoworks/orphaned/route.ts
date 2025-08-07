import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { withApiMonitoring } from '@/lib/api-wrapper'

export const dynamic = 'force-dynamic'

async function handleGET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) {
    return authResult.response || errorResponse('Unauthorized', 401)
  }

  // Restrict to SUPER_ADMIN
  if (authResult.user.role !== 'SUPER_ADMIN') {
    return errorResponse('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const externalId = searchParams.get('externalId') || undefined
  const clientId = searchParams.get('clientId') || undefined
  const clientEmail = searchParams.get('clientEmail') || undefined
  const processedParam = searchParams.get('processed')
  const processed = processedParam === undefined ? undefined : processedParam === 'true'
  const limit = Math.min(Number(searchParams.get('limit') || '25'), 100)

  const orphanedTasks = await prisma.orphaned_tasks.findMany({
    where: {
      externalId,
      clientId,
      clientEmail,
      processed,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return successResponse({ orphanedTasks, total: orphanedTasks.length })
}

export const GET = withApiMonitoring(handleGET)


