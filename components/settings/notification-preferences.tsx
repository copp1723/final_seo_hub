'use client'
import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Bell, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface NotificationPreferences {
  emailNotifications: boolean
  requestCreated: boolean
  statusChanged: boolean
  taskCompleted: boolean
  weeklySummary: boolean
  marketingEmails: boolean
}

interface Props {
  preferences: NotificationPreferences | null
  onUpdate: (preferences: NotificationPreferences) => void
  saving: boolean
}

export function NotificationPreferencesComponent({ preferences, onUpdate, saving }: Props) {
  if (!preferences) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    onUpdate({ ...preferences, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Master Email Toggle */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <Label htmlFor="email-notifications" className="text-base font-semibold">
                  Email Notifications
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Master control for all email notifications
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Content Notifications
            <Badge variant="secondary" className="ml-2">New Feature</Badge>
          </CardTitle>
          <CardDescription>
            Get notified when new content is added to your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These notifications show you exactly what SEO work is being done on your behalf, 
              including new pages, blog posts, and Google Business Profile posts.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <Label htmlFor="task-completed" className="font-medium">
                  Content Creation Notifications
                </Label>
              </div>
              <p className="text-sm text-blue-700">
                Get beautiful emails when pages, blogs, or GBP posts are added
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">📄 Pages</Badge>
                <Badge variant="outline" className="text-xs">📝 Blogs</Badge>
                <Badge variant="outline" className="text-xs">🏢 GBP Posts</Badge>
              </div>
            </div>
            <Switch
              id="task-completed"
              checked={preferences.taskCompleted && preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('taskCompleted', checked)}
              disabled={!preferences.emailNotifications}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Other Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Other Notifications</CardTitle>
          <CardDescription>
            Control other types of email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="request-created">Request Created</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new SEO requests are created
              </p>
            </div>
            <Switch
              id="request-created"
              checked={preferences.requestCreated && preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('requestCreated', checked)}
              disabled={!preferences.emailNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="status-changed">Status Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when request status changes
              </p>
            </div>
            <Switch
              id="status-changed"
              checked={preferences.statusChanged && preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('statusChanged', checked)}
              disabled={!preferences.emailNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-summary">Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly progress reports
              </p>
            </div>
            <Switch
              id="weekly-summary"
              checked={preferences.weeklySummary && preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('weeklySummary', checked)}
              disabled={!preferences.emailNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive product updates and announcements
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={preferences.marketingEmails && preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('marketingEmails', checked)}
              disabled={!preferences.emailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Preview Content Notifications
          </CardTitle>
          <CardDescription className="text-green-700">
            See what your content notifications will look like
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/api/email/preview/content?type=page', '_blank')}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              📄 Page Preview
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/api/email/preview/content?type=blog', '_blank')}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              📝 Blog Preview
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/api/email/preview/content?type=gbp_post', '_blank')}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              🏢 GBP Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {!preferences.emailNotifications && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Email notifications are disabled. Enable the master toggle above to receive notifications.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}