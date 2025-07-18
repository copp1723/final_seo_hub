import { NextRequest, NextResponse } from 'next/server'
import { SimpleAuth } from '@/lib/auth-simple'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { TaskStatus, UserRole, RequestStatus, TaskType } from '@prisma/client'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { taskCompletedTemplate } from '@/lib/mailgun/templates'
import { logger } from '@/lib/logger'

// Schema for status update
const updateStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  notes: z.string().optional(),
  requestId: z.string().optional(), // Adding requestId to the schema
  targetUrl: z.string().url().optional(), // Adding targetUrl to the schema
})

const completedTaskDetailsSchema = z.object({
  title: z.string(),
  type: z.nativeEnum(TaskType),
  url: z.string().url().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await SimpleAuth.getSessionFromRequest(request)

    if (!session?.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: taskId } = context.params

    const body = await request.json()
    const validation = updateStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    // Extract requestId and targetUrl from validation.data
    const { status, notes, requestId, targetUrl } = validation.data

    const existingTask = await prisma.tasks.findUnique({
      where: { id: taskId },
      include: { 
        users: true,
      }
    })

    if (!existingTask) {
      logger.warn('Task not found for status update', { taskId, userId: session.user.id })
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    if (session.user.role !== UserRole.ADMIN && 
        session.user.role !== UserRole.SUPER_ADMIN &&
        existingTask.userId !== session.user.id
    ) {
      logger.warn('Unauthorized attempt to update task status', { 
        taskId, 
        userId: session.user.id, 
        userRole: session.user.role,
        taskOwnerId: existingTask.userId
      })
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update this task' },
        { status: 403 }
      )
    }

    if ((existingTask.status === TaskStatus.COMPLETED || existingTask.status === TaskStatus.CANCELLED) &&
        status !== TaskStatus.COMPLETED && status !== TaskStatus.CANCELLED &&
        session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN) {
      logger.warn('Attempt to change task status from final state by unauthorized user', { 
        taskId, 
        currentStatus: existingTask.status, 
        newStatus: status,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: `Cannot change status from ${existingTask.status} unless you are an Admin` },
        { status: 400 }
      )
    }

    const updatedTask = await prisma.tasks.update({
      where: { id: taskId },
      data: {
        status: status,
        completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
        description: notes,
        updatedAt: new Date(),
        // @ts-ignore - requestId will be present after schema migration
        requestId: requestId, // Update requestId from payload
        targetUrl: targetUrl, // Update targetUrl from payload
      },
      include: { 
        users: true,
      }
    })

    const fullUser = await prisma.users.findUnique({
      where: { id: session.user.id }
    })

    if (!fullUser) {
      // This should ideally not happen if SimpleAuth.getSessionFromRequest is reliable
      logger.error('Full user object not found for session user', { userId: session.user.id });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch the request if requestId is provided and task is being completed
    let associatedRequest = null;
    if (requestId && status === TaskStatus.COMPLETED && existingTask.status !== TaskStatus.COMPLETED) {
      associatedRequest = await prisma.requests.findUnique({
        where: { id: requestId },
        include: { users: true }
      });

      if (associatedRequest) {
        let updateData: { [key: string]: any } = {};
        switch (updatedTask.type) {
          case TaskType.PAGE:
            updateData.pagesCompleted = { increment: 1 };
            break;
          case TaskType.BLOG:
            updateData.blogsCompleted = { increment: 1 };
            break;
          case TaskType.GBP_POST:
            updateData.gbpPostsCompleted = { increment: 1 };
            break;
          case TaskType.IMPROVEMENT:
            updateData.improvementsCompleted = { increment: 1 };
            break;
          default:
            logger.warn('Unknown TaskType for completion increment', { taskId: updatedTask.id, taskType: updatedTask.type });
        }

        const currentCompletedTasks = associatedRequest.completedTasks ? 
          (Array.isArray(associatedRequest.completedTasks) 
            ? associatedRequest.completedTasks 
            : JSON.parse(associatedRequest.completedTasks as string)
          ) : [];
        
        const newCompletedTaskEntry = {
          title: updatedTask.title,
          type: updatedTask.type,
          url: updatedTask.targetUrl || undefined, // Ensure undefined for null
          completedAt: updatedTask.completedAt?.toISOString(),
          taskId: updatedTask.id,
        };

        const validatedCompletedTask = completedTaskDetailsSchema.safeParse(newCompletedTaskEntry)
        if (!validatedCompletedTask.success) {
          logger.error('Failed to validate completed task details for JSON storage', { taskId: updatedTask.id, errors: validatedCompletedTask.error.errors });
        } else {
          currentCompletedTasks.push(validatedCompletedTask.data);
          updateData.completedTasks = currentCompletedTasks;
        }

        associatedRequest = await prisma.requests.update({
          where: { id: requestId },
          data: updateData,
          include: { users: true }
        });
        logger.info('Associated request updated with task completion', { 
          requestId: requestId, 
          taskId: updatedTask.id, 
          taskType: updatedTask.type 
        });
      } else {
        logger.warn('Requested requestId not found for task completion', { taskId: updatedTask.id, requestId });
      }
    }

    // Send notifications if status changed to COMPLETED and if there's an associated request and user
    if (status === TaskStatus.COMPLETED && existingTask.status !== TaskStatus.COMPLETED && associatedRequest && fullUser) {
      try {
        const taskDetailsForEmail = {
          title: updatedTask.title,
          type: updatedTask.type.toString(), // Convert enum to string
          url: updatedTask.targetUrl || undefined,
        };
        const emailTemplate = taskCompletedTemplate(associatedRequest, fullUser, taskDetailsForEmail);
        await queueEmailWithPreferences(
          fullUser.id, // Use fullUser.id for preferences
          'taskCompleted',
          { 
            ...emailTemplate,
            to: associatedRequest.users?.email || fullUser.email 
          }
        )
        logger.info('Task completion email queued', { 
          taskId: updatedTask.id, 
          userId: fullUser.id, 
          requestId: associatedRequest?.id 
        })
      } catch (emailError) {
        logger.error('Failed to queue task completion email', emailError, { 
          taskId: updatedTask.id, 
          userId: fullUser.id, 
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown email error' 
        })
      }
    }

    logger.info('Task status updated successfully', {
      taskId: updatedTask.id,
      oldStatus: existingTask.status,
      newStatus: updatedTask.status,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: `Task ${taskId} status updated to ${status}`,
      task: updatedTask,
      updatedRequest: associatedRequest ? { id: associatedRequest.id, completedTasks: associatedRequest.completedTasks } : undefined
    })

  } catch (error) {
    logger.error('Error updating task status', error, {
      path: request.url,
      method: 'PUT',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })
    
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
