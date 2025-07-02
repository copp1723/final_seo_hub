import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/api-auth'
import { createPostHandler } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'
import { z } from 'zod'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
})

function findBestMatch(userMessage: string): string {
  const message = userMessage.toLowerCase()
  
  // Direct FAQ matching
  for (const faq of SEO_KNOWLEDGE_BASE.faqs) {
    const question = faq.question.toLowerCase()
    
    // Check for keyword matches
    if (message.includes('package') && question.includes('package')) {
      return faq.answer
    }
    if (message.includes('time') && (question.includes('long') || question.includes('time'))) {
      return faq.answer
    }
    if (message.includes('kpi') || message.includes('metrics') || message.includes('performance')) {
      if (question.includes('kpi') || question.includes('performance')) {
        return faq.answer
      }
    }
    if (message.includes('traffic') && question.includes('traffic')) {
      return faq.answer
    }
    if (message.includes('metadata') || message.includes('schema')) {
      if (question.includes('metadata') || question.includes('schema')) {
        return faq.answer
      }
    }
    if (message.includes('result') && question.includes('improvement')) {
      return faq.answer
    }
    if (message.includes('content') && question.includes('content')) {
      return faq.answer
    }
    if (message.includes('website') && question.includes('website')) {
      return faq.answer
    }
    if (message.includes('rank') && question.includes('rank')) {
      return faq.answer
    }
    if (message.includes('ai') || message.includes('overview')) {
      if (question.includes('ai') || question.includes('overview')) {
        return faq.answer
      }
    }
  }
  
  // Package-specific questions
  if (message.includes('silver') || message.includes('gold') || message.includes('platinum')) {
    const packageInfo = Object.entries(SEO_KNOWLEDGE_BASE.packages)
      .map(([name, details]) => `${name.toUpperCase()}: ${details.pages} pages, ${details.blogs} blogs, ${details.gbpPosts} GBP posts, ${details.improvements} improvements`)
      .join('\n\n')
    
    return `Here are the details for each SEO package:\n\n${packageInfo}\n\nAll packages include: ${SEO_KNOWLEDGE_BASE.packages.silver.description}`
  }
  
  // General help
  if (message.includes('help') || message.includes('what can you do')) {
    return `I can help you with questions about:\n\n• SEO package details and what's included\n• Timeline and expectations for SEO results\n• Key performance indicators (KPIs) we track\n• Content strategy and types of pages we create\n• Technical SEO optimizations\n• Traffic analysis and troubleshooting\n\nFeel free to ask me anything about your SEO campaign!`
  }
  
  // Fallback response
  return `I'd be happy to help with that question! While I don't have a specific answer ready, I can help you with:\n\n• SEO package details\n• Timeline expectations\n• Performance metrics\n• Content strategy\n• Technical optimizations\n\nCould you rephrase your question or ask about one of these topics? If you need detailed assistance, you can also escalate this to our SEO team using the button below.`
}

export const POST = createPostHandler<z.infer<typeof chatRequestSchema>>(
  async (req, { user, body }) => {
    const { message, conversationId } = body!

    // Find the best matching response from knowledge base
    const content = findBestMatch(message)
    
    const response = {
      id: Math.random().toString(36).substring(7),
      content,
      conversationId: conversationId || 'new',
      timestamp: new Date().toISOString(),
    }

    logger.info('Chat request processed', {
      userId: user?.id,
      conversationId,
      messageLength: message.length,
      hasMatch: content !== 'fallback'
    })

    return successResponse(response)
  },
  {
    validateBody: chatRequestSchema,
    rateLimit: 'api'
  }
)