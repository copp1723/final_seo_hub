'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ContentNotificationDemo } from '@/components/demo/content-notification-demo'
import { NotificationPreferencesComponent } from '@/components/settings/notification-preferences'
import { ContentNotificationAdminPanel } from '@/components/admin/content-notification-management'
import { Settings, Users, Mail, Eye } from 'lucide-react'

// Mock data for demo
const mockNotifications = {
  emailNotifications: true,
  requestCreated: true,
  statusChanged: true,
  taskCompleted: true,
  weeklySummary: true,
  marketingEmails: false
}

export function NotificationSystemDemo() {
  const [demoNotifications, setDemoNotifications] = useState(mockNotifications)
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Content Notification System Demo</h1>
        <p className="text-muted-foreground text-lg">
          Complete notification management for SEO content delivery
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <Badge variant="secondary">✨ New Feature</Badge>
          <Badge variant="outline">Demo Ready</Badge>
          <Badge variant="outline">Enterprise Grade</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="user-settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            User Settings
          </TabsTrigger>
          <TabsTrigger value="admin-panel" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Admin Panel
          </TabsTrigger>
          <TabsTrigger value="live-demo" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Live Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  User Control
                </CardTitle>
                <CardDescription>
                  Dealerships control their notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Master email toggle</li>
                  <li>• Content-specific notifications</li>
                  <li>• Email preview capabilities</li>
                  <li>• Granular preference control</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Admin Management
                </CardTitle>
                <CardDescription>
                  Admins can manage notifications across users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• User notification overview</li>
                  <li>• Bulk preference management</li>
                  <li>• Test notification sending</li>
                  <li>• Agency-level controls</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Smart Notifications
                </CardTitle>
                <CardDescription>
                  Beautiful, context-aware email notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Content type detection</li>
                  <li>• Progress tracking</li>
                  <li>• Mobile responsive design</li>
                  <li>• SEO value explanation</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">🎯 Business Impact</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">For Dealerships:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Immediate visibility into SEO work</li>
                    <li>• Builds trust and confidence</li>
                    <li>• Encourages engagement with content</li>
                    <li>• Demonstrates ongoing value</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">For SEO Teams:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Reduces "what are you doing?" questions</li>
                    <li>• Professional communication</li>
                    <li>• Automatic progress reporting</li>
                    <li>• Improved client retention</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Notification Preferences</CardTitle>
              <CardDescription>
                This is what dealership users see in their settings page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesComponent
                preferences={demoNotifications}
                onUpdate={setDemoNotifications}
                saving={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin-panel" className="space-y-6">
          <ContentNotificationAdminPanel />
        </TabsContent>

        <TabsContent value="live-demo" className="space-y-6">
          <ContentNotificationDemo />
        </TabsContent>
      </Tabs>
    </div>
  )
}