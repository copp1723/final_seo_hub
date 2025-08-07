import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated || !auth.user) {
    return auth.response || errorResponse('Unauthorized', 401)
  }

  // Restrict to admins
  if (!['SUPER_ADMIN', 'AGENCY_ADMIN'].includes(auth.user.role)) {
    return errorResponse('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids') || ''
  const idParam = searchParams.get('id') || ''
  const dealershipId = searchParams.get('dealershipId') || undefined

  const rawIds = [idsParam, idParam]
    .filter(Boolean)
    .join(',')
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean)

  if (rawIds.length === 0) {
    return errorResponse('Provide id or ids query param', 400)
  }

  const requests = await prisma.requests.findMany({
    where: {
      seoworksTaskId: { in: rawIds },
      ...(dealershipId ? { dealershipId } : {}),
    },
    select: {
      id: true,
      seoworksTaskId: true,
      title: true,
      status: true,
      type: true,
      dealershipId: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  const foundIds = new Set(requests.map(r => r.seoworksTaskId || ''))
  const missing = rawIds.filter(id => !foundIds.has(id))

  return successResponse({
    count: requests.length,
    requests,
    missing,
  })
}


