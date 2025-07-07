/**
 * Enhanced Chat API - Safe parallel implementation
 * Uses your existing OpenRouter setup with optional enhancements
 */

import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/api-auth'
import { createPostHandler } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'
import { generateChatResponse } from '@/lib/openrouter'
import { z } from 'zod'
import { features } from '@/app/lib/features'
import { getSystemPrompt } from '@/app/lib/ai/enhanced-prompts'
import { chatCache } from '@/app/lib/cache/performance-cache'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
})

// Use your existing findBestMatch function
function findBestMatch(userMessage: string): string {
  const message = userMessage.toLowerCase()
  
  // Direct FAQ matching (same as your implementation)
  for (const faq of SEO_KNOWLEDGE_BASE.faqs) {
    const question = faq.question.toLowerCase()
    
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
  
  return `I'd be happy to help with that question! While I don't have a specific answer ready, I can help you with:\n\n• SEO package details\n• Timeline expectations\n• Performance metrics\n• Content strategy\n• Technical optimizations\n\nCould you rephrase your question or ask about one of these topics? If you need detailed assistance, you can also escalate this to our SEO team using the button below.`
}

export const POST = createPostHandler<z.infer<typeof chatRequestSchema>>(
  async (req, { user, body }) => {
    const { message, conversationId } = body!

    try {
      // Try cache first if feature is enabled
      if (features.semanticChatCache) {
        const cachedResponse = await chatCache.getWithSimilarity(message)
        if (cachedResponse) {
          logger.info('Cache hit for chat query', {
            userId: user?.id,
            conversationId
          })
          
          return successResponse({
            id: Math.random().toString(36).substring(7),
            content: cachedResponse,
            conversationId: conversationId || 'cache-' + Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            source: 'cache'
          })
        }
      }

      // Find knowledge base match (same as existing logic)
      const knowledgeBaseAnswer = findBestMatch(message)
      const hasKnowledgeMatch = !knowledgeBaseAnswer.includes("I'd be happy to help with that question!")
      
      let content: string
      let finalConversationId: string

      // Use OpenRouter if configured
      if (process.env.OPENROUTER_API_KEY) {
        try {
          // If enhanced prompts are enabled, we'll need to modify generateChatResponse
          // For now, use existing implementation
          const llmResponse = await generateChatResponse(
            message,
            conversationId,
            hasKnowledgeMatch ? knowledgeBaseAnswer : undefined
          )
          content = llmResponse.content
          finalConversationId = llmResponse.conversationId
          
          // Cache successful responses if enabled
          if (features.semanticChatCache && content && !content.includes('technical difficulties')) {
            await chatCache.set(message, { query: message, response: content })
          }
        } catch (llmError) {
          logger.warn('LLM generation failed, falling back to knowledge base', {
            error: llmError,
            userId: user?.id
          })
          content = knowledgeBaseAnswer
          finalConversationId = conversationId || 'kb-' + Math.random().toString(36).substring(7)
        }
      } else {
        // Use knowledge base only
        content = knowledgeBaseAnswer
        finalConversationId = conversationId || 'kb-' + Math.random().toString(36).substring(7)
      }

      const response = {
        id: Math.random().toString(36).substring(7),
        content,
        conversationId: finalConversationId,
        timestamp: new Date().toISOString(),
        source: process.env.OPENROUTER_API_KEY ? 'llm' : 'knowledge_base',
        features: {
          cacheEnabled: features.semanticChatCache,
          enhancedPrompts: features.enhancedPrompts
        }
      }

      logger.info('Enhanced chat request processed', {
        userId: user?.id,
        conversationId: finalConversationId,
        messageLength: message.length,
        hasKnowledgeMatch,
        source: response.source,
        cacheStats: features.semanticChatCache ? chatCache.getStats() : null
      })

      return successResponse(response)
    } catch (error) {
      logger.error('Enhanced chat processing error', {
        error,
        userId: user?.id,
        message: message.substring(0, 100)
      })

      // Final fallback
      const fallbackResponse = {
        id: Math.random().toString(36).substring(7),
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or feel free to escalate your question to our SEO team for immediate assistance.",
        conversationId: conversationId || 'error-' + Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        source: 'fallback'
      }

      return successResponse(fallbackResponse)
    }
  },
  {
    validateBody: chatRequestSchema,
    rateLimit: 'api'
  }
)