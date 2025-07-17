import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)

    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)
    const resolvedParams = await params
    const taskId = resolvedParams.id

    // For now, return success since this is a placeholder
    // In a real implementation, you would update the task in the database
    console.log(`Task ${taskId} status updated to ${status} by user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: `Task status updated to ${status}`
    })

  } catch (error) {
    console.error('Error updating task status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
