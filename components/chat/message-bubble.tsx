import { Button } from '@/components/ui/button'
import { User, Bot, AlertCircle } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
  onEscalate?: () => void
}

export function MessageBubble({ message, onEscalate }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-600' : 'bg-gray-200'
        }`}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-gray-600" />
          )}
        </div>
        
        <div>
          <div className={`rounded-lg px-4 py-3 ${
            isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
          }`}>
            {isUser ? (
              <p className="text-sm">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
          
          {!isUser && onEscalate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEscalate}
              className="mt-1 text-xs"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Send to SEO team
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}