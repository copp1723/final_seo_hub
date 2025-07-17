// OpenRouter configuration
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

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

    // System prompt for SEO assistant
    const systemPrompt = `You are an expert SEO assistant for automotive dealerships.You help dealership clients understand their SEO packages, strategies, and performance metrics.Key information about our SEO services:
- We offer Silver, Gold, and Platinum packages with different content volumes
- All packages include pages, blogs, Google Business Profile posts, and SEO improvements
- We focus on automotive dealership SEO with local targeting
- We track KPIs like keyword rankings, organic traffic, search visibility, and conversions
- SEO typically takes 3-6 months to show significant results

${knowledgeBaseAnswer ? `Knowledge Base Answer: ${knowledgeBaseAnswer}` : ''}

Provide helpful, accurate responses about SEO services.If you don't have specific information, acknowledge this and suggest they can escalate to the SEO team for detailed assistance.Keep responses conversational but professional, and focus on practical SEO advice for automotive dealerships.`

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
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const completion = await response.json()
    const assistantResponse = completion.choices?.[0]?.message?.content || 
      "I apologize, but I'm having trouble generating a response right now. Please try again or escalate to our SEO team."

    // Update conversation
    const updatedMessages: ChatMessage[] = [
     ...conversation.messages,
      { role: 'user' as const, content: userMessage },
      { role: 'assistant' as const, content: assistantResponse }
    ]
    updateConversation(conversation.id, updatedMessages)

    return {
      content: assistantResponse,
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
