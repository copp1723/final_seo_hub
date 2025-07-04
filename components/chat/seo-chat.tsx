'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { MessageBubble } from './message-bubble'
import { EscalationModal } from './escalation-modal'
import { SEO_KNOWLEDGE_BASE } from '@/lib/seo-knowledge'
import {
  Send,
  FileText,
  Globe,
  Search,
  TrendingUp,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestionCards = [
  {
    icon: FileText,
    title: 'What does my SEO package include?',
    prompt: SEO_KNOWLEDGE_BASE.faqs[0].question,
  },
  {
    icon: Globe,
    title: 'How long until I see results?',
    prompt: SEO_KNOWLEDGE_BASE.faqs[5].question,
  },
  {
    icon: Search,
    title: 'What are the KPIs for SEO?',
    prompt: SEO_KNOWLEDGE_BASE.faqs[2].question,
  },
  {
    icon: TrendingUp,
    title: 'Why is my traffic down?',
    prompt: SEO_KNOWLEDGE_BASE.faqs[3].question,
  },
]

export function SEOChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEscalation, setShowEscalation] = useState(false)
  const [escalationContext, setEscalationContext] = useState<{question: string; answer: string} | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const handleSend = async (text?: string) => {
    const messageText = text || input
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: conversationId
        }),
      })

      const result = await response.json()
      const data = result.data || result // Handle both new and old response formats

      // Update conversation ID if we got a new one
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.message || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      // Error handled silently on client-side
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = (message: Message) => {
    const previousMessage = messages[messages.indexOf(message) - 1]
    if (previousMessage) {
      setEscalationContext({
        question: previousMessage.content,
        answer: message.content,
      })
      setShowEscalation(true)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {messages.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">SEO Assistant</h2>
            <p className="text-gray-600">Ask me anything about your SEO package and strategy</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestionCards.map((card, index) => (
              <Card
                key={index}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSend(card.prompt)}
              >
                <div className="flex items-start space-x-3">
                  <card.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">{card.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{card.prompt}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onEscalate={message.role === 'assistant' ? () => handleEscalate(message) : undefined}
            />
          ))}
          {loading && (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask about your SEO package..."
          className="flex-1"
          rows={2}
        />
        <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {showEscalation && escalationContext && (
        <EscalationModal
          open={showEscalation}
          onClose={() => setShowEscalation(false)}
          context={escalationContext}
        />
      )}
    </div>
  )
}