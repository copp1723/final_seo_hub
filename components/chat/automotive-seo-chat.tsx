'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, TrendingUp, Car, MapPin, BarChart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageBubble } from './message-bubble'
import { EscalationModal } from './escalation-modal'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: string
  metadata?: {
    intents?: string[]
    topics?: string[]
    suggestions?: string[]
  }
}

interface DealershipInfo {
  brand?: string
  location?: string
  inventorySize?: number
  currentPackage?: 'silver' | 'gold' | 'platinum'
}

export function AutomotiveSEOChat({ dealershipInfo }: { dealershipInfo?: DealershipInfo }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>()
  const [escalateMessage, setEscalateMessage] = useState<Message | null>(null)
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initial greeting based on dealership info
  useEffect(() => {
    const greeting = dealershipInfo?.brand 
      ? `Hello! I'm your specialized ${dealershipInfo.brand} SEO consultant. I combine deep automotive industry knowledge with cutting-edge SEO expertise to help drive more qualified traffic to your showroom. How can I help optimize your online presence today?`
      : `Hello! I'm your automotive SEO expert, specializing in helping dealerships dominate their local markets through strategic SEO. I understand the unique challenges of automotive retail and can help you attract more qualified buyers. What SEO challenge can I help you solve today?`

    setMessages([{
      id: '1',
      content: greeting,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        suggestions: [
          "How can I improve my inventory page rankings?",
          "What's the best local SEO strategy for my dealership?",
          "How do I track my SEO ROI effectively?"
        ]
      }
    }])
  }, [dealershipInfo])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/automotive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationId,
          dealershipInfo,
          includeAnalytics: true
        })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: data.data.id,
          content: data.data.content,
          sender: 'assistant',
          timestamp: data.data.timestamp,
          metadata: data.data.metadata
        }

        setMessages(prev => [...prev, assistantMessage])
        setConversationId(data.data.conversationId)
        
        // Update smart suggestions
        if (data.data.metadata?.suggestions) {
          setSmartSuggestions(data.data.metadata.suggestions)
        }
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast({
        title: "Connection Error",
        description: "Unable to connect to the SEO assistant. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSend()
  }

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'ranking_analysis': return <TrendingUp className="h-3 w-3" />
      case 'inventory_seo': return <Car className="h-3 w-3" />
      case 'local_seo': return <MapPin className="h-3 w-3" />
      case 'traffic_analysis': return <BarChart className="h-3 w-3" />
      default: return null
    }
  }

  const getTopicColor = (topic: string) => {
    if (topic.startsWith('brand:')) return 'bg-blue-100 text-blue-800'
    if (topic.startsWith('package:')) return 'bg-green-100 text-green-800'
    if (topic.startsWith('inventory:')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header with context */}
      <div className="border-b px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Automotive SEO Expert</span>
          </div>
          {dealershipInfo && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {dealershipInfo.brand && <Badge variant="outline">{dealershipInfo.brand}</Badge>}
              {dealershipInfo.currentPackage && (
                <Badge className={`capitalize ${
                  dealershipInfo.currentPackage === 'platinum' ? 'bg-purple-100 text-purple-800' :
                  dealershipInfo.currentPackage === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {dealershipInfo.currentPackage} Package
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble
              message={message}
              onEscalate={() => setEscalateMessage(message)}
            />
            
            {/* Show metadata badges */}
            {message.metadata && message.sender === 'assistant' && (
              <div className="mt-2 ml-12 space-y-2">
                {message.metadata.intents && message.metadata.intents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {message.metadata.intents.map((intent, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                        {getIntentIcon(intent)}
                        {intent.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {message.metadata.topics && message.metadata.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {message.metadata.topics.map((topic, idx) => (
                      <Badge key={idx} className={`text-xs ${getTopicColor(topic)}`}>
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Bot className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Analyzing your SEO query...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about inventory SEO, local rankings, content strategy..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Specialized in automotive SEO, local search, inventory optimization, and lead generation
        </p>
      </div>

      {/* Escalation Modal */}
      {escalateMessage && (
        <EscalationModal
          isOpen={!!escalateMessage}
          onClose={() => setEscalateMessage(null)}
          message={escalateMessage}
        />
      )}
    </div>
  )
}