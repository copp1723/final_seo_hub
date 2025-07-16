import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/api-auth'
import { createPostHandler } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'
import { AUTOMOTIVE_KNOWLEDGE, AUTOMOTIVE_SEO_EXPERT_PROMPT } from '@/app/lib/ai/automotive-seo-agent'
import { generateChatResponse } from '@/lib/openrouter'
import { z } from 'zod'

const automotiveChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
  dealershipInfo: z.object({
    brand: z.string().optional(),
    currentPackage: z.enum(['silver', 'gold', 'platinum']).optional(),
  }).optional(),
  includeAnalytics: z.boolean().optional(),
})

// Enhanced automotive-specific knowledge matching
function findAutomotiveMatch(userMessage: string, dealershipInfo?: any): { content: string; metadata?: any } {
  const message = userMessage.toLowerCase()
  
  // Intent detection for automotive queries
  const intents = []
  const topics = []
  const suggestions = []
  
  // Detect intents
  if (message.includes('rank') || message.includes('position') || message.includes('ranking')) {
    intents.push('ranking_analysis')
  }
  if (message.includes('inventory') || message.includes('vehicle') || message.includes('car')) {
    intents.push('inventory_seo')
  }
  if (message.includes('local') || message.includes('near me') || message.includes('location')) {
    intents.push('local_seo')
  }
  if (message.includes('traffic') || message.includes('visitor') || message.includes('analytics')) {
    intents.push('traffic_analysis')
  }
  
  // Detect topics
  if (dealershipInfo?.brand) {
    topics.push(`brand:${dealershipInfo.brand}`)
  }
  if (dealershipInfo?.currentPackage) {
    topics.push(`package:${dealershipInfo.currentPackage}`)
  }
  if (message.includes('inventory') || message.includes('vehicle')) {
    topics.push('inventory:management')
  }
  
  // Generate smart suggestions based on intent
  if (intents.includes('inventory_seo')) {
    suggestions.push(
      "How can I optimize my vehicle description pages?",
      "What's the best schema markup for vehicle listings?",
      "How do I improve my inventory page load speed?"
    )
  } else if (intents.includes('local_seo')) {
    suggestions.push(
      "How do I improve my Google Business Profile for automotive?",
      "What local keywords should I target?",
      "How can I dominate 'near me' searches?"
    )
  } else {
    suggestions.push(
      "How can I improve my inventory page rankings?",
      "What's the best local SEO strategy for my dealership?",
      "How do I track my SEO ROI effectively?"
    )
  }
  
  // Try to find automotive-specific matches first
  if (message.includes('inventory') || message.includes('vehicle') || message.includes('car')) {
    return {
      content: `For automotive inventory SEO, focus on these key areas:

• **Vehicle-Specific Pages**: Create dedicated landing pages for each model and trim level with unique, detailed content
• **Dynamic Inventory Feeds**: Implement real-time inventory updates with proper schema markup for vehicle listings
• **Local Inventory Targeting**: Optimize for "[Model] near me" and "[Brand] dealer [city]" searches
• **Mobile-First Design**: Ensure fast loading on mobile devices since many customers browse inventory on-the-go
• **High-Quality Images**: Use multiple vehicle photos with optimized file sizes and descriptive alt text

${dealershipInfo?.currentPackage ? `Your ${dealershipInfo.currentPackage.toUpperCase()} package includes ${SEO_KNOWLEDGE_BASE.packages[dealershipInfo.currentPackage as keyof typeof SEO_KNOWLEDGE_BASE.packages]?.pages} optimized pages per month, perfect for building out your inventory content strategy.` : ''}

Would you like me to dive deeper into any of these areas?`,
      metadata: { intents, topics, suggestions }
    }
  }
  
  // Check for local SEO queries
  if (message.includes('local') || message.includes('near me') || message.includes('google business')) {
    return {
      content: `Local SEO is crucial for automotive dealerships. Here's your action plan:

• **Google Business Profile**: Keep your profile updated with current inventory photos, customer reviews responses, and regular posts about new arrivals
• **Local Keywords**: Target "brand + dealer + city", "used cars + city", and service-related terms
• **Review Management**: Encourage satisfied customers to leave reviews and respond promptly to all feedback
• **Local Citations**: Ensure consistent NAP (Name, Address, Phone) across all directories and automotive listing sites
• **Geo-Targeted Content**: Create location-specific landing pages for each service area

For dealerships, I also recommend claiming and optimizing listings on Cars.com, AutoTrader, and other automotive-specific platforms.`,
      metadata: { intents, topics, suggestions }
    }
  }
  
  // Fall back to general SEO knowledge base
  for (const faq of SEO_KNOWLEDGE_BASE.faqs) {
    const question = faq.question.toLowerCase()
    
    if (message.includes('package') && question.includes('package')) {
      return { content: faq.answer, metadata: { intents, topics, suggestions } }
    }
    if (message.includes('time') && (question.includes('long') || question.includes('time'))) {
      return { content: faq.answer, metadata: { intents, topics, suggestions } }
    }
    if (message.includes('kpi') || message.includes('metrics') || message.includes('performance')) {
      if (question.includes('kpi') || question.includes('performance')) {
        return { content: faq.answer, metadata: { intents, topics, suggestions } }
      }
    }
  }
  
  // Default automotive response
  return {
    content: `I specialize in automotive SEO and can help you with:

• **Inventory Optimization**: Vehicle listing pages, schema markup, and dynamic content
• **Local Search Domination**: Google Business Profile, local keywords, and "near me" optimization  
• **Content Strategy**: Model-specific pages, comparison content, and service department SEO
• **Technical SEO**: Site speed for image-heavy inventory, mobile optimization, and Core Web Vitals
• **Analytics & ROI**: Tracking leads from organic search, VDP performance, and competitor analysis

What specific automotive SEO challenge would you like to tackle?`,
    metadata: { intents, topics, suggestions }
  }
}

export const POST = createPostHandler<z.infer<typeof automotiveChatRequestSchema>>(
  async (req, { user, body }) => {
    const { message, conversationId, dealershipInfo, includeAnalytics } = body!

    try {
      // Get automotive-specific response
      const automotiveMatch = findAutomotiveMatch(message, dealershipInfo)
      const hasKnowledgeMatch = !automotiveMatch.content.includes("What specific automotive SEO challenge")
      
      let content: string
      let finalConversationId: string
      let metadata = automotiveMatch.metadata

      // If OpenRouter is configured, enhance the response with LLM
      if (process.env.OPENROUTER_API_KEY) {
        try {
          // Use automotive-specific prompt
          const llmResponse = await generateChatResponse(
            message,
            conversationId,
            hasKnowledgeMatch ? automotiveMatch.content : undefined
          )
          content = llmResponse.content
          finalConversationId = llmResponse.conversationId
        } catch (llmError) {
          logger.warn('LLM generation failed, falling back to automotive knowledge base', {
            error: llmError,
            userId: user?.id
          })
          // Fallback to automotive knowledge base
          content = automotiveMatch.content
          finalConversationId = conversationId || 'auto-' + Math.random().toString(36).substring(7)
        }
      } else {
        // Use automotive knowledge base only
        content = automotiveMatch.content
        finalConversationId = conversationId || 'auto-' + Math.random().toString(36).substring(7)
      }

      const response = {
        id: Math.random().toString(36).substring(7),
        content,
        conversationId: finalConversationId,
        timestamp: new Date().toISOString(),
        source: process.env.OPENROUTER_API_KEY ? 'automotive_llm' : 'automotive_knowledge_base',
        metadata
      }

      logger.info('Automotive chat request processed', {
        userId: user?.id,
        conversationId: finalConversationId,
        messageLength: message.length,
        hasKnowledgeMatch,
        intents: metadata?.intents,
        dealershipBrand: dealershipInfo?.brand,
        source: response.source
      })

      return successResponse(response)
    } catch (error) {
      logger.error('Automotive chat processing error', {
        error,
        userId: user?.id,
        message: message.substring(0, 100)
      })

      // Final fallback
      const fallbackResponse = {
        id: Math.random().toString(36).substring(7),
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or feel free to escalate your question to our SEO team for immediate assistance.",
        conversationId: conversationId || 'error-auto-' + Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        source: 'fallback',
        metadata: {
          suggestions: [
            "How can I improve my inventory page rankings?",
            "What's the best local SEO strategy for my dealership?",
            "How do I track my SEO ROI effectively?"
          ]
        }
      }

      return successResponse(fallbackResponse)
    }
  },
  {
    validateBody: automotiveChatRequestSchema,
    rateLimit: 'api'
  }
) 