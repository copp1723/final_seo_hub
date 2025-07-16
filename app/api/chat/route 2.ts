import { NextRequest } from 'next/server'
import { requireAuth, errorResponse, successResponse } from '@/lib/api-auth'
import { rateLimits } from '@/lib/rate-limit'
import { OpenAI } from 'openai'
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'

// Lazy initialize to avoid build errors
let openai: OpenAI | null = null

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    })
  }
  return openai
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimits.ai(request)
  if (rateLimitResponse) return rateLimitResponse
  
  const authResult = await requireAuth(request)
  if (!authResult.authenticated || !authResult.user) return authResult.response || errorResponse('Unauthorized', 401)
  
  try {
    const { message } = await request.json()
    
    if (!message) {
      return errorResponse('Message is required')
    }

    // Build system prompt with SEO knowledge
    const systemPrompt = `You are Rylie, an AI-powered SEO assistant specializing in automotive dealership SEO. 
    You help dealerships improve their online visibility and organic lead generation.

    IMPORTANT CONTEXT:
    You have deep knowledge about SEO services, packages, and best practices for automotive dealerships.

    KEY KNOWLEDGE AREAS:
    1. SEO Package Details (Silver, Gold, Platinum) - know exact deliverables for each
    2. Content Types - pages, blogs, GBP posts, and their specific purposes
    3. Timeline Expectations - 3-6 months for strong results, 6+ months for peak momentum
    4. KPIs - keyword rankings, organic traffic, search visibility, conversions
    5. Technical SEO - metadata, schema markup, internal linking

    When answering questions:
    - Be professional but conversational
    - Provide specific, actionable advice
    - Reference actual numbers and timelines when relevant
    - Acknowledge that SEO is a long-term investment
    - Be transparent about realistic expectations`

    const completion = await getOpenAI().chat.completions.create({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const responseContent = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'

    return successResponse({ content: responseContent })
    
  } catch (error) {
    console.error('Chat API error:', error)
    return errorResponse('Failed to process chat message', 500)
  }
}