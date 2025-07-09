'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Eye, Send, CheckCircle, XCircle } from 'lucide-react'

interface DemoResult {
  success: boolean
  message: string
  webhookResponse?: any
  previewUrl?: string
  subject?: string
  taskDetails?: any
}

export function ContentNotificationDemo() {
  const [taskType, setTaskType] = useState('page')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isWebhookLoading, setIsWebhookLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [webhookResult, setWebhookResult] = useState<DemoResult | null>(null)
  const [emailSubject, setEmailSubject] = useState<string>('')

  const generatePreview = async () => {
    setIsPreviewLoading(true)
    try {
      const response = await fetch('/api/email/preview/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType })
      })
      
      const data = await response.json()
      if (data.success) {
        setPreviewUrl(data.previewUrl)
        setEmailSubject(data.subject)
      }
    } catch (error) {
      console.error('Preview failed:', error)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const testWebhook = async () => {
    setIsWebhookLoading(true)
    setWebhookResult(null)
    
    try {
      const response = await fetch('/api/test/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskType,
          userId: 'demo-user-123'  // You can make this dynamic if needed
        })
      })
      
      const data = await response.json()
      setWebhookResult(data)
    } catch (error) {
      setWebhookResult({
        success: false,
        message: `Webhook test failed: ${error}`
      })
    } finally {
      setIsWebhookLoading(false)
    }
  }

  const contentTypes = [
    { value: 'page', label: 'New Page', icon: '📄' },
    { value: 'blog', label: 'Blog Post', icon: '📝' },
    { value: 'gbp_post', label: 'GBP Post', icon: '🏢' },
    { value: 'improvement', label: 'Improvement', icon: '⚡' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧' }
  ]

  return (
    <div className=\"space-y-6 p-6 max-w-6xl mx-auto\">
      <div className=\"text-center space-y-2\">
        <h1 className=\"text-3xl font-bold\">Content Notification Demo</h1>
        <p className=\"text-muted-foreground\">
          See how dealerships get notified when new content is added to their website
        </p>
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <Mail className=\"h-5 w-5\" />
              Demo Controls
            </CardTitle>
            <CardDescription>
              Choose a content type and see how the notification system works
            </CardDescription>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            <div className=\"space-y-2\">
              <label className=\"text-sm font-medium\">Content Type</label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className=\"flex items-center gap-2\">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className=\"grid grid-cols-2 gap-3\">
              <Button 
                onClick={generatePreview} 
                disabled={isPreviewLoading}
                variant=\"outline\"
                className=\"w-full\"
              >
                {isPreviewLoading ? (
                  <Loader2 className=\"h-4 w-4 animate-spin\" />
                ) : (
                  <Eye className=\"h-4 w-4\" />
                )}
                Preview Email
              </Button>

              <Button 
                onClick={testWebhook} 
                disabled={isWebhookLoading}
                className=\"w-full\"
              >
                {isWebhookLoading ? (
                  <Loader2 className=\"h-4 w-4 animate-spin\" />
                ) : (
                  <Send className=\"h-4 w-4\" />
                )}
                Test Webhook
              </Button>
            </div>

            {emailSubject && (
              <div className=\"p-3 bg-muted rounded-lg\">
                <p className=\"text-sm font-medium mb-1\">Email Subject:</p>
                <p className=\"text-sm text-muted-foreground\">{emailSubject}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Result */}
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <Send className=\"h-5 w-5\" />
              Webhook Test Result
            </CardTitle>
            <CardDescription>
              Live test of the webhook processing system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {webhookResult ? (
              <div className=\"space-y-3\">
                <div className=\"flex items-center gap-2\">
                  {webhookResult.success ? (
                    <>
                      <CheckCircle className=\"h-5 w-5 text-green-500\" />
                      <Badge variant=\"outline\" className=\"bg-green-50 text-green-700 border-green-200\">
                        Success
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className=\"h-5 w-5 text-red-500\" />
                      <Badge variant=\"outline\" className=\"bg-red-50 text-red-700 border-red-200\">
                        Failed
                      </Badge>
                    </>
                  )}
                </div>
                
                <p className=\"text-sm\">{webhookResult.message}</p>
                
                {webhookResult.webhookResponse && (
                  <details className=\"text-xs\">
                    <summary className=\"cursor-pointer font-medium\">Webhook Response</summary>
                    <pre className=\"mt-2 p-2 bg-muted rounded text-xs overflow-auto\">
                      {JSON.stringify(webhookResult.webhookResponse, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <p className=\"text-muted-foreground text-sm\">
                Click \"Test Webhook\" to see the notification system in action
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Preview */}
      {previewUrl && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <Eye className=\"h-5 w-5\" />
              Email Preview
            </CardTitle>
            <CardDescription>
              This is what the dealership receives when {taskType} content is added
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className=\"border rounded-lg overflow-hidden\">
              <iframe 
                src={previewUrl} 
                className=\"w-full h-[600px]\"
                title=\"Email Preview\"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Features */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Key Features Demonstrated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm\">
            <div>
              <h4 className=\"font-medium mb-2\">Email Template Features:</h4>
              <ul className=\"space-y-1 text-muted-foreground\">
                <li>• Mobile-responsive design</li>
                <li>• Branded company colors</li>
                <li>• Content type detection</li>
                <li>• Monthly progress tracking</li>
                <li>• Direct content links</li>
                <li>• SEO benefits explanation</li>
              </ul>
            </div>
            <div>
              <h4 className=\"font-medium mb-2\">System Features:</h4>
              <ul className=\"space-y-1 text-muted-foreground\">
                <li>• Webhook validation & security</li>
                <li>• User preference respect</li>
                <li>• Email queue with retries</li>
                <li>• Comprehensive error handling</li>
                <li>• Package usage tracking</li>
                <li>• Multiple content types</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}