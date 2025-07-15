import { prisma } from '@/lib/prisma'
import { TaskStatus, TaskType } from '@prisma/client'

/**
 * Task Context Module for AI Integration
 * Provides completed task retrieval and semantic search capabilities
 */

export interface TaskReference {
  id: string
  title: string
  description?: string | null
  type: TaskType
  completedUrl?: string | null
  completedTitle?: string | null
  completedNotes?: string | null
  completedAt?: Date | null
  targetUrl?: string | null
  targetCity?: string | null
  targetModel?: string | null
  keywords?: any
  requestTitle?: string
  requestDescription?: string
}

export interface TaskSearchOptions {
  userId: string
  limit?: number
  taskTypes?: TaskType[]
  includeKeywords?: boolean
  dateRange?: {
    from?: Date
    to?: Date
  }
}

/**
 * Retrieve completed tasks for a user with optional filtering
 */
export async function getCompletedTasks(options: TaskSearchOptions): Promise<TaskReference[]> {
  const {
    userId,
    limit = 50,
    taskTypes,
    includeKeywords = true,
    dateRange
  } = options

  try {
    const tasks = await prisma.tasks.findMany({
      where: {
        userId,
        status: TaskStatus.COMPLETED,
        completedAt: {
          not: null,
          ...(dateRange?.from && { gte: dateRange.from }),
          ...(dateRange?.to && { lte: dateRange.to })
        },
        ...(taskTypes && taskTypes.length > 0 && { type: { in: taskTypes } })
      },
      // Tasks don't have request relationships in current schema
      orderBy: {
        completedAt: 'desc'
      },
      take: limit
    })

    return tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      completedUrl: undefined, // Field doesn't exist in schema
      completedTitle: undefined, // Field doesn't exist in schema
      completedNotes: undefined, // Field doesn't exist in schema
      completedAt: task.completedAt,
      targetUrl: task.targetUrl,
      targetCity: undefined, // Field doesn't exist in schema
      targetModel: undefined, // Field doesn't exist in schema
      keywords: includeKeywords ? task.keywords : undefined,
      requestTitle: undefined, // No request relationship in current schema
      requestDescription: undefined // No request relationship in current schema
    }))
  } catch (error) {
    console.error('Error retrieving completed tasks:', error)
    return []
  }
}

/**
 * Perform semantic search on completed tasks based on query
 */
export function searchTasksByQuery(tasks: TaskReference[], query: string): TaskReference[] {
  const queryLower = query.toLowerCase()
  const searchTerms = queryLower.split(/\s+/).filter(term => term.length > 2)
  
  if (searchTerms.length === 0) {
    return tasks.slice(0, 10) // Return recent tasks if no meaningful search terms
  }

  // Score tasks based on relevance
  const scoredTasks = tasks.map(task => {
    let score = 0
    const searchableText = [
      task.title,
      task.description,
      task.completedTitle,
      task.completedNotes,
      task.targetCity,
      task.targetModel,
      task.requestTitle,
      task.requestDescription
    ].filter(Boolean).join(' ').toLowerCase()

    // Extract keywords if available
    let keywordText = ''
    if (task.keywords && Array.isArray(task.keywords)) {
      keywordText = task.keywords.join(' ').toLowerCase()
    }

    // Score based on exact matches
    searchTerms.forEach(term => {
      // Title matches get highest score
      if (task.title.toLowerCase().includes(term)) score += 10
      if (task.completedTitle?.toLowerCase().includes(term)) score += 8
      
      // Keyword matches get high score
      if (keywordText.includes(term)) score += 6
      
      // Description and notes matches
      if (task.description?.toLowerCase().includes(term)) score += 4
      if (task.completedNotes?.toLowerCase().includes(term)) score += 4
      
      // Target information matches
      if (task.targetCity?.toLowerCase().includes(term)) score += 5
      if (task.targetModel?.toLowerCase().includes(term)) score += 5
      
      // General content matches
      if (searchableText.includes(term)) score += 2
    })

    // Boost score for recent tasks
    if (task.completedAt) {
      const daysSinceCompletion = (Date.now() - task.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCompletion < 30) score += 3
      else if (daysSinceCompletion < 90) score += 1
    }

    // Boost score for tasks with URLs (more actionable)
    if (task.completedUrl) score += 2

    return { task, score }
  })

  // Sort by score and return top results
  return scoredTasks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.task)
}

/**
 * Find tasks related to specific automotive topics
 */
export function findTasksByTopic(tasks: TaskReference[], topic: string): TaskReference[] {
  const topicLower = topic.toLowerCase()
  
  // Define topic-specific keywords
  const topicKeywords: Record<string, string[]> = {
    'inventory': ['vdp', 'vehicle', 'inventory', 'listing', 'car', 'truck', 'suv'],
    'local': ['local', 'city', 'near me', 'location', 'gbp', 'google business'],
    'content': ['blog', 'article', 'content', 'page', 'landing'],
    'technical': ['technical', 'speed', 'mobile', 'schema', 'structured data'],
    'keywords': ['keyword', 'ranking', 'serp', 'search terms'],
    'competition': ['competitor', 'competition', 'analysis', 'market'],
    'reviews': ['review', 'testimonial', 'rating', 'feedback']
  }

  // Find matching topic keywords
  const relevantKeywords = topicKeywords[topicLower] || [topicLower]
  
  return tasks.filter(task => {
    const searchableText = [
      task.title,
      task.description,
      task.completedTitle,
      task.completedNotes,
      task.type.toLowerCase()
    ].filter(Boolean).join(' ').toLowerCase()

    return relevantKeywords.some(keyword => searchableText.includes(keyword))
  }).slice(0, 8)
}

/**
 * Generate task context for AI prompt
 */
export function generateTaskContext(tasks: TaskReference[]): string {
  if (tasks.length === 0) {
    return "No relevant completed tasks found."
  }

  let context = "## Recently Completed SEO Tasks:\n\n"
  
  tasks.forEach((task, index) => {
    context += `### ${index + 1}. ${task.title}\n`
    
    if (task.completedTitle && task.completedTitle !== task.title) {
      context += `**Completed as:** ${task.completedTitle}\n`
    }
    
    if (task.completedUrl) {
      context += `**URL:** ${task.completedUrl}\n`
    }
    
    if (task.type) {
      context += `**Type:** ${task.type.toLowerCase().replace('_', ' ')}\n`
    }
    
    if (task.targetCity || task.targetModel) {
      context += `**Target:** ${[task.targetCity, task.targetModel].filter(Boolean).join(', ')}\n`
    }
    
    if (task.completedNotes) {
      context += `**Notes:** ${task.completedNotes.substring(0, 200)}${task.completedNotes.length > 200 ? '...' : ''}\n`
    }
    
    if (task.completedAt) {
      context += `**Completed:** ${task.completedAt.toLocaleDateString()}\n`
    }
    
    context += '\n'
  })

  context += "\n**Note:** Reference these completed tasks when providing recommendations or answering questions about similar work.\n"
  
  return context
}

/**
 * Extract task-related intents from user query
 */
export function detectTaskRelatedIntents(query: string): string[] {
  const intents = []
  const queryLower = query.toLowerCase()
  
  // Task reference intents
  if (queryLower.match(/what.*done|completed|finished|previous|before|already/)) {
    intents.push('task_history')
  }
  
  if (queryLower.match(/similar|like.*before|same.*as|previous.*work/)) {
    intents.push('similar_tasks')
  }
  
  if (queryLower.match(/show.*work|examples|samples|what.*built/)) {
    intents.push('task_examples')
  }
  
  if (queryLower.match(/progress|status|how.*going|update/)) {
    intents.push('task_progress')
  }

  return intents
}

/**
 * Get task statistics for context
 */
export async function getTaskStatistics(userId: string): Promise<{
  totalCompleted: number
  byType: Record<string, number>
  recentActivity: number
}> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const [totalCompleted, tasksByType, recentTasks] = await Promise.all([
      prisma.tasks.count({
        where: { userId, status: TaskStatus.COMPLETED }
      }),
      prisma.tasks.groupBy({
        by: ['type'],
        where: { userId, status: TaskStatus.COMPLETED },
        _count: { type: true }
      }),
      prisma.tasks.count({
        where: { 
          userId, 
          status: TaskStatus.COMPLETED,
          completedAt: { gte: thirtyDaysAgo }
        }
      })
    ])

    const byType = tasksByType.reduce((acc: any, item: any) => {
      acc[item.type] = item._count.type
      return acc
    }, {} as Record<string, number>)

    return {
      totalCompleted,
      byType,
      recentActivity: recentTasks
    }
  } catch (error) {
    console.error('Error getting task statistics:', error)
    return {
      totalCompleted: 0,
      byType: {},
      recentActivity: 0
    }
  }
}
