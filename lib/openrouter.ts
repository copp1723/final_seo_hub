import { ENHANCED_AUTOMOTIVE_SEO_EXPERT_PROMPT, enhanceResponse } from './enhanced-automotive-seo-prompt'

// OpenRouter configuration
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY is not set. AI chat features will not work.')
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ConversationContext {
  id: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// In-memory conversation storage (in production, use Redis or database)
const conversations = new Map<string, ConversationContext>()

export function getConversation(conversationId: string): ConversationContext | null {
  return conversations.get(conversationId) || null
}

export function createConversation(): ConversationContext {
  const id = Math.random().toString(36).substring(7)
  const conversation: ConversationContext = {
    id,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
  conversations.set(id, conversation)
  return conversation
}

export function updateConversation(conversationId: string, messages: ChatMessage[]): void {
  const conversation = conversations.get(conversationId)
  if (conversation) {
    conversation.messages = messages
    conversation.updatedAt = new Date()
    conversations.set(conversationId, conversation)
  }
}

export async function generateChatResponse(
  userMessage: string,
  conversationId?: string,
  knowledgeBaseAnswer?: string
): Promise<{ content: string; conversationId: string }> {
  try {
    // Get or create conversation
    let conversation = conversationId ? getConversation(conversationId) : null
    if (!conversation) {
      conversation = createConversation()
    }

    // Enhanced automotive SEO expert system prompt
    const systemPrompt = ENHANCED_AUTOMOTIVE_SEO_EXPERT_PROMPT + `

Key information about our current SEO service packages:
- Silver: 3 pages, 4 blogs, 8 GBP posts, 8 improvements monthly
- Gold: 6 pages, 8 blogs, 16 GBP posts, 10 improvements monthly
- Platinum: 9 pages, 12 blogs, 20 GBP posts, 20 improvements monthly

All content is high-quality, original, and targeted for the areas you serve and vehicles you sell.

${knowledgeBaseAnswer ? `Knowledge Base Answer: ${knowledgeBaseAnswer}` : ''}`

    // Build message history
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages,
      { role: 'user', content: userMessage }
    ]

    // Call OpenRouter API directly
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'SEO Hub Chat'
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const completion = await response.json()
    let assistantResponse = completion.choices?.[0]?.message?.content ||
      "I apologize, but I'm having trouble generating a response right now. Please try again or escalate to our SEO team."

    // Enhance response with contextual intelligence
    const enhancedResponse = enhanceResponse(assistantResponse, {
      currentMonth: new Date().getMonth(),
      userConcerns: extractConcerns(userMessage),
      brand: extractBrand(userMessage)
    })

    // Update conversation
    const updatedMessages: ChatMessage[] = [
     ...conversation.messages,
      { role: 'user' as const, content: userMessage },
      { role: 'assistant' as const, content: enhancedResponse }
    ]
    updateConversation(conversation.id, updatedMessages)

    return {
      content: enhancedResponse,
      conversationId: conversation.id
    }
  } catch (error) {
    console.error('OpenRouter API error:', error)
    
    // Fallback to knowledge base answer if available
    if (knowledgeBaseAnswer) {
      return {
        content: knowledgeBaseAnswer,
        conversationId: conversationId || createConversation().id
      }
    }
    
    throw new Error('Failed to generate response')
  }
}

// Helper functions to extract context from user messages
function extractConcerns(message: string): string[] {
  const concerns: string[] = []
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('cars')) {
    concerns.push('inventory')
  }
  if (lowerMessage.includes('compet') || lowerMessage.includes('rival') || lowerMessage.includes('other dealer')) {
    concerns.push('competition')
  }
  if (lowerMessage.includes('traffic') || lowerMessage.includes('visitors') || lowerMessage.includes('leads')) {
    concerns.push('performance')
  }
  if (lowerMessage.includes('rank') || lowerMessage.includes('position') || lowerMessage.includes('google')) {
    concerns.push('rankings')
  }

  return concerns
}

function extractBrand(message: string): string | undefined {
  const lowerMessage = message.toLowerCase()
  const brands = ['honda', 'toyota', 'ford', 'chevrolet', 'chevy', 'bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac']

  for (const brand of brands) {
    if (lowerMessage.includes(brand)) {
      return brand === 'chevy' ? 'chevrolet' : brand
    }
  }

  // Check for luxury indicators
  if (lowerMessage.includes('luxury') || lowerMessage.includes('premium') || lowerMessage.includes('high-end')) {
    return 'luxury'
  }

  return undefined
}
