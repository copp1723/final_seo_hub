'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ChatTest() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = () => {
    console.log('🧪 Test handleSend called', { input })
    if (!input.trim()) return
    
    setMessages(prev => [...prev, `User: ${input}`])
    setInput('')
    setIsLoading(true)
    
    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, `Bot: I received your message: "${input}"`])
      setIsLoading(false)
    }, 1000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🧪 Test input changed:', e.target.value)
    setInput(e.target.value)
  }

  const handleButtonClick = () => {
    console.log('🧪 Test button clicked')
    handleSend()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Chat Functionality Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Messages */}
          <div className="h-40 overflow-y-auto border rounded p-4 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet. Try typing something!</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="mb-2">
                  {msg}
                </div>
              ))
            )}
            {isLoading && (
              <div className="text-blue-500">Bot is typing...</div>
            )}
          </div>

          {/* Input Form */}
          <form 
            onSubmit={(e) => {
              console.log('🧪 Test form submitted')
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a test message..."
              disabled={isLoading}
              className="flex-1"
              onFocus={() => console.log('🧪 Test input focused')}
              onBlur={() => console.log('🧪 Test input blurred')}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              onClick={handleButtonClick}
            >
              Send
            </Button>
          </form>

          {/* Debug Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Input value: "{input}"</p>
            <p>Is loading: {isLoading.toString()}</p>
            <p>Button disabled: {(isLoading || !input.trim()).toString()}</p>
            <p>Messages count: {messages.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
