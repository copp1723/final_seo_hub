'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Send, X } from 'lucide-react'
import { useCSRF } from '@/hooks/useCSRF'

interface EscalationModalProps {
  open: boolean
  onClose: () => void
  context: {
    question: string
    answer: string
    originalQuery?: string
  }
}

export function EscalationModal({ open, onClose, context }: EscalationModalProps) {
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { secureRequest } = useCSRF()

  const handleSubmit = async () => {
    setSubmitting(true)
    
    try {
      // Create a request with the question and AI response
      const response = await secureRequest('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat Escalation: ${context.question.substring(0, 60)}${context.question.length > 60 ? '...' : ''}`,
          description: `**Original User Query:**\n${context.originalQuery || context.question}\n\n**Specific Question:**\n${context.question}\n\n**AI Assistant Response:**\n${context.answer}\n\n**Additional Context:**\n${additionalNotes || 'No additional notes provided.'}\n\n---\n*This request was escalated from the AI chat assistant for expert review.*`,
          type: 'improvement', // Use existing valid type
          priority: 'MEDIUM'
        })
      })

      if (response.ok) {
        onClose()
        setAdditionalNotes('')
        // Show success toast
        toast({
          title: "Request Sent Successfully",
          description: "Your question has been sent to the SEO team.You can track the response in your Requests page.",
          variant: "success"
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Failed to Send Request",
          description: errorData.error || 'Unknown error occurred.Please try again.',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Escalation error:', error)
      toast({
        title: "Network Error",
        description: "Failed to send request.Please check your connection and try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between border-b shrink-0">
          <CardTitle>Send to SEO Team</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto flex-1 py-4">
          {context.originalQuery && context.originalQuery !== context.question && (
            <div>
              <p className="text-sm font-medium mb-1 text-blue-700">Original Query:</p>
              <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">{context.originalQuery}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium mb-1">Your Question:</p>
            <p className="text-sm text-gray-600">{context.question}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-1">AI Response:</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{context.answer}</p>
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
              {submitting ? 'Sending...' : 'Send to Team'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
