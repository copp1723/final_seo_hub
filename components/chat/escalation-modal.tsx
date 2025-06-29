'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Send, X } from 'lucide-react'

interface EscalationModalProps {
  open: boolean
  onClose: () => void
  context: {
    question: string
    answer: string
  }
}

export function EscalationModal({ open, onClose, context }: EscalationModalProps) {
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    
    try {
      // Create a request with the question and AI response
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `SEO Question: ${context.question.substring(0, 50)}...`,
          description: `Question: ${context.question}\n\nAI Response: ${context.answer}\n\nAdditional Notes: ${additionalNotes}`,
          type: 'question',
          priority: 'MEDIUM',
        }),
      })

      if (response.ok) {
        onClose()
        // Could add a success toast here
      }
    } catch (error) {
      console.error('Failed to escalate:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Send to SEO Team</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Your Question:</p>
            <p className="text-sm text-gray-600">{context.question}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-1">AI Response:</p>
            <p className="text-sm text-gray-600 line-clamp-3">{context.answer}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Additional Notes (optional)
            </label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Add any additional context or specific concerns..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Team
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}