'use client'
import { NotificationDebugPanel } from '@/components/debug/notification-debug-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔧 Notification System Debug</h1>
        <p className="text-muted-foreground">
          Troubleshoot notification system issues for your demo
        </p>
      </div>
      
      <NotificationDebugPanel />
      
      <Card>
        <CardHeader>
          <CardTitle>🚀 Demo Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>1. Settings Issue:</strong> If notifications tab shows loading blocks, check API endpoints</p>
            <p><strong>2. Email Service Warning:</strong> Verify Mailgun environment variables are set</p>
            <p><strong>3. Quick Test:</strong> Try accessing email preview directly:</p>
            <div className="bg-gray-100 p-2 rounded font-mono text-xs">
              /api/email/preview/content?type=page
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}