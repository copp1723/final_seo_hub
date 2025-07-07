import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/api-auth'
import { createPostHandler } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'
import { z } from 'zod'
import OpenAI from 'openai'
import { 
  AUTOMOTIVE_SEO_EXPERT_PROMPT, 
  enhanceAutomotiveContext,
  enhanceResponse,
  generateAnalyticsInsights,
  AUTOMOTIVE_KNOWLEDGE 
} from '@/app/lib/ai/automotive-seo-agent'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
  dealershipInfo: z.object({
    brand: z.string().optional(),
    location: z.string().optional(),
    inventorySize: z.number().optional(),
    currentPackage: z.enum(['silver', 'gold', 'platinum']).optional()
  }).optional(),
  includeAnalytics: z.boolean().optional()
})

// Initialize OpenRouter client
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Enhanced conversation storage with metadata
interface EnhancedConversation {
  id: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  metadata: {
    dealershipInfo?: any
    topics: string[]
    intents: string[]
  }
  createdAt: Date
  updatedAt: Date
}

const conversations = new Map<string, EnhancedConversation>()

// Intent detection for better context
function detectIntent(message: string): string[] {
  const intents = []
  const lower = message.toLowerCase()
  
  // SEO intents
  if (lower.match(/rank|ranking|position|serp/)) intents.push('ranking_analysis')
  if (lower.match(/traffic|visitor|session/)) intents.push('traffic_analysis')
  if (lower.match(/keyword|query|search term/)) intents.push('keyword_research')
  if (lower.match(/content|blog|page/)) intents.push('content_strategy')
  if (lower.match(/technical|speed|mobile|schema/)) intents.push('technical_seo')
  
  // Automotive intents
  if (lower.match(/inventory|vdp|srp|vehicle/)) intents.push('inventory_seo')
  if (lower.match(/local|near me|location/)) intents.push('local_seo')
  if (lower.match(/competition|competitor/)) intents.push('competitive_analysis')
  if (lower.match(/gbp|google business|review/)) intents.push('gbp_optimization')
  if (lower.match(/lead|conversion|form|call/)) intents.push('conversion_optimization')
  
  return intents
}

// Extract topics for context building
function extractTopics(message: string): string[] {
  const topics = []
  const lower = message.toLowerCase()
  
  // Extract car brands/models mentioned
  const brands = ['ford', 'chevrolet', 'toyota', 'honda', 'nissan', 'mazda', 'hyundai', 'kia', 'volkswagen', 'audi', 'bmw', 'mercedes']
  brands.forEach(brand => {
    if (lower.includes(brand)) topics.push(`brand:${brand}`)
  })
  
  // Extract SEO package references
  if (lower.includes('silver')) topics.push('package:silver')
  if (lower.includes('gold')) topics.push('package:gold')
  if (lower.includes('platinum')) topics.push('package:platinum')
  
  // Extract service types
  if (lower.match(/new car|new vehicle/)) topics.push('inventory:new')
  if (lower.match(/used car|used vehicle|pre-owned/)) topics.push('inventory:used')
  if (lower.match(/service|parts|repair/)) topics.push('service:aftersales')
  
  return topics
}

// Generate smart suggestions based on conversation
function generateSmartSuggestions(conversation: EnhancedConversation): string[] {
  const suggestions = []
  const recentIntents = conversation.metadata.intents.slice(-3)
  
  if (recentIntents.includes('ranking_analysis')) {
    suggestions.push("How can I improve rankings for high-value model keywords?")
    suggestions.push("What's the best strategy for ranking in multiple cities?")
  }
  
  if (recentIntents.includes('inventory_seo')) {
    suggestions.push("How should I optimize VDPs for better visibility?")
    suggestions.push("What schema markup is essential for vehicle listings?")
  }
  
  if (recentIntents.includes('local_seo')) {
    suggestions.push("How can I dominate 'near me' searches?")
    suggestions.push("What's the best GBP strategy for multi-location dealers?")
  }
  
  if (recentIntents.includes('content_strategy')) {
    suggestions.push("What blog topics drive the most qualified traffic?")
    suggestions.push("How do I create comparison pages that convert?")
  }
  
  // Add package-specific suggestions
  if (conversation.metadata.dealershipInfo?.currentPackage) {
    const pkg = conversation.metadata.dealershipInfo.currentPackage
    suggestions.push(`How can I maximize my ${pkg} package performance?`)
  }
  
  return suggestions.slice(0, 3) // Return top 3 suggestions
}

export const POST = createPostHandler<z.infer<typeof chatRequestSchema>>(
  async (req, { user, body }) => {
    const { message, conversationId, dealershipInfo, includeAnalytics } = body!

    try {
      // Get or create conversation
      let conversation = conversationId ? conversations.get(conversationId) : null
      if (!conversation) {
        conversation = {
          id: Math.random().toString(36).substring(7),
          messages: [],
          metadata: {
            dealershipInfo,
            topics: [],
            intents: []
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
        conversations.set(conversation.id, conversation)
      }

      // Update conversation metadata
      const currentIntents = detectIntent(message)
      const currentTopics = extractTopics(message)
      conversation.metadata.intents.push(...currentIntents)
      conversation.metadata.topics.push(...currentTopics)
      if (dealershipInfo) {
        conversation.metadata.dealershipInfo = {
          ...conversation.metadata.dealershipInfo,
          ...dealershipInfo
        }
      }

      // Build enhanced context
      const enhancedContext = enhanceAutomotiveContext(
        message,
        conversation.metadata.dealershipInfo,
        conversation.messages
      )

      // Prepare messages with enhanced context
      const messages = [
        { role: 'system' as const, content: enhancedContext },
        ...conversation.messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        { role: 'user' as const, content: message }
      ]

      let aiResponse: string

      if (process.env.OPENROUTER_API_KEY) {
        try {
          // Use Claude with enhanced automotive SEO context
          const completion = await openrouter.chat.completions.create({
            model: "anthropic/claude-3.5-sonnet",
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7,
          })

          aiResponse = completion.choices[0]?.message?.content || "I couldn't generate a response."
          
          // Enhance response with metrics and insights
          if (includeAnalytics && currentIntents.some(i => ['traffic_analysis', 'ranking_analysis'].includes(i))) {
            // In production, these would come from real analytics
            const mockMetrics = {
              organicTraffic: { trend: 15 },
              vdpViews: { rate: 2.3 },
              localVisibility: { packRanking: 4 }
            }
            const insights = generateAnalyticsInsights(mockMetrics)
            if (insights.length > 0) {
              aiResponse += "\n\n**Data-Driven Insights:**\n" + insights.map(i => `• ${i}`).join('\n')
            }
          }
          
          aiResponse = enhanceResponse(aiResponse, message, true)
        } catch (error) {
          logger.error('OpenRouter API error:', error)
          // Fallback to knowledge base
          aiResponse = findEnhancedKnowledgeMatch(message, conversation.metadata)
        }
      } else {
        // Use enhanced knowledge base matching
        aiResponse = findEnhancedKnowledgeMatch(message, conversation.metadata)
      }

      // Update conversation history
      conversation.messages.push(
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      )
      conversation.updatedAt = new Date()

      // Generate smart suggestions
      const suggestions = generateSmartSuggestions(conversation)

      const response = {
        id: Math.random().toString(36).substring(7),
        content: aiResponse,
        conversationId: conversation.id,
        timestamp: new Date().toISOString(),
        metadata: {
          intents: currentIntents,
          topics: currentTopics,
          suggestions: suggestions,
          source: process.env.OPENROUTER_API_KEY ? 'automotive_ai' : 'enhanced_knowledge'
        }
      }

      logger.info('Automotive chat request processed', {
        userId: user?.id,
        conversationId: conversation.id,
        intents: currentIntents,
        topics: currentTopics
      })

      return successResponse(response)
    } catch (error) {
      logger.error('Automotive chat error', { error, userId: user?.id })
      
      return successResponse({
        id: Math.random().toString(36).substring(7),
        content: "I apologize for the technical issue. Please try rephrasing your question or contact our SEO team directly for immediate assistance.",
        conversationId: conversationId || 'error',
        timestamp: new Date().toISOString(),
        metadata: { source: 'error' }
      })
    }
  },
  {
    validateBody: chatRequestSchema,
    rateLimit: 'api'
  }
)

// Enhanced knowledge matching with automotive context
function findEnhancedKnowledgeMatch(query: string, metadata: any): string {
  const lower = query.toLowerCase()
  const intents = detectIntent(query)
  
  // Check standard knowledge base first
  for (const faq of SEO_KNOWLEDGE_BASE.faqs) {
    if (lower.includes(faq.question.toLowerCase().split(' ')[0])) {
      // Enhance with automotive context
      let enhanced = faq.answer
      
      if (metadata.dealershipInfo?.currentPackage) {
        const packageName = metadata.dealershipInfo.currentPackage as keyof typeof SEO_KNOWLEDGE_BASE.packages
        const pkg = SEO_KNOWLEDGE_BASE.packages[packageName]
        enhanced += `\n\nWith your ${metadata.dealershipInfo.currentPackage} package, you receive ${pkg.pages} pages, ${pkg.blogs} blogs, and ${pkg.gbpPosts} GBP posts monthly to support this strategy.`
      }
      
      return enhanced
    }
  }
  
  // Provide intent-specific responses
  if (intents.includes('inventory_seo')) {
    return `For inventory SEO optimization, focus on:

**Dynamic Content Strategy:**
• Create unique, detailed descriptions for each vehicle
• Implement structured data for all VDPs
• Optimize images with descriptive alt text
• Build model-specific landing pages

**Technical Considerations:**
• Ensure fast page load times despite heavy images
• Implement proper canonical tags for similar vehicles
• Create XML sitemaps for inventory pages
• Use dynamic meta titles with year, make, model, trim

**Local Optimization:**
• Include city/region in VDP titles
• Create location-based inventory searches
• Optimize for "trucks for sale in [city]" queries

Would you like specific recommendations for your inventory size and market?`
  }
  
  if (intents.includes('local_seo')) {
    return `Local SEO is crucial for automotive dealerships. Here's your strategic approach:

**Google Business Profile Excellence:**
• Post 2-3 times per week minimum
• Showcase inventory with photos
• Highlight special offers and events
• Respond to all reviews within 24 hours

**Local Content Strategy:**
• Create "serving [city]" pages for each major area
• Build neighborhood-specific content
• Optimize for "[brand] dealer near me" searches
• Include local landmarks and directions

**Citation Building:**
• Ensure NAP consistency across directories
• Claim automotive-specific listings
• Build relationships with local businesses
• Participate in community events for mentions

Your current package includes GBP posts to support this strategy. Would you like help optimizing your local presence?`
  }
  
  // Default sophisticated response
  return `I understand you're looking for automotive SEO insights. While I need more specific information to provide targeted advice, here are key areas where I can help:

**Strategic Planning:**
• Inventory-based content optimization
• Local market domination strategies
• Competitive analysis and positioning
• Multi-location SEO coordination

**Technical Excellence:**
• Vehicle schema implementation
• Site speed for image-heavy pages
• Mobile optimization for on-lot shoppers
• Dynamic URL structure best practices

**Content & Conversion:**
• Model comparison pages that convert
• Service department SEO
• Finance calculator optimization
• Review generation strategies

What specific challenge can I help you solve today?`
}