import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-auth'
import { logger } from '@/lib/logger'
import { queueEmailWithPreferences } from '@/lib/mailgun/queue'
import { weeklySummaryTemplate } from '@/lib/mailgun/templates'
import { subDays } from 'date-fns'

// This endpoint should be called by a cron job service (e.g., Render's cron jobs)
// Recommended schedule: Every Monday at 9 AM

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET
  
  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
    logger.warn('Unauthorized cron job access attempt')
    return errorResponse('Unauthorized', 401)
  }
  
  try {
    const oneWeekAgo = subDays(new Date(), 7)
    let emailsSent = 0
    let errors = 0
    
    // Get all users with weekly summary enabled
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          emailNotifications: true,
          weeklySummary: true
        }
      },
      include: {
        preferences: true
      }
    })
    
    logger.info(`Starting weekly summary for ${users.length} users`)
    
    // Process each user
    for (const user of users) {
      try {
        // Get user's requests from the past week
        const requests = await prisma.request.findMany({
          where: {
            userId: user.id,
            updatedAt: {
              gte: oneWeekAgo
            }
          }
        })
        
        // Get completed requests
        const completedRequests = requests.filter(r => 
          r.status === 'COMPLETED' && r.completedAt && r.completedAt >= oneWeekAgo
        )
        
        // Get in-progress requests
        const inProgressRequests = requests.filter(r => r.status === 'IN_PROGRESS')
        
        // Get completed tasks from all requests
        const completedTasks: Array<{ title: string; type: string; completedAt: Date }> = []
        
        for (const request of requests) {
          if (request.completedTasks && Array.isArray(request.completedTasks)) {
            const tasks = request.completedTasks as any[]
            tasks.forEach(task => {
              const completedAt = new Date(task.completedAt)
              if (completedAt >= oneWeekAgo) {
                completedTasks.push({
                  title: task.title,
                  type: task.type,
                  completedAt
                })
              }
            })
          }
        }
        
        // Get upcoming tasks (pending requests with high priority)
        const upcomingRequests = await prisma.request.findMany({
          where: {
            userId: user.id,
            status: 'PENDING',
            priority: 'HIGH'
          },
          take: 5,
          orderBy: { createdAt: 'asc' }
        })
        
        const upcomingTasks = upcomingRequests.map(r => ({
          title: r.title,
          type: r.type,
          priority: r.priority
        }))
        
        // Only send if there's activity
        if (requests.length > 0 || completedTasks.length > 0) {
          const summary = {
            totalRequests: requests.length,
            completedRequests: completedRequests.length,
            inProgressRequests: inProgressRequests.length,
            completedTasks,
            upcomingTasks
          }
          
          const emailTemplate = weeklySummaryTemplate(user, summary)
          const sent = await queueEmailWithPreferences(
            user.id,
            'weeklySummary',
            {
              ...emailTemplate,
              to: user.email
            }
          )
          
          if (sent) {
            emailsSent++
          } else {
            errors++
          }
        }
      } catch (error) {
        logger.error('Error processing weekly summary for user', error, {
          userId: user.id
        })
        errors++
      }
    }
    
    logger.info('Weekly summary cron job completed', {
      totalUsers: users.length,
      emailsSent,
      errors
    })
    
    return successResponse({
      message: 'Weekly summary emails processed',
      stats: {
        totalUsers: users.length,
        emailsSent,
        errors
      }
    })
  } catch (error) {
    logger.error('Error in weekly summary cron job', error)
    return errorResponse('Failed to process weekly summaries', 500)
  }
}

// POST endpoint for manual trigger (admin only)
export async function POST(request: NextRequest) {
  // This allows admins to manually trigger the weekly summary
  // Add proper admin authentication here
  return GET(request)
}