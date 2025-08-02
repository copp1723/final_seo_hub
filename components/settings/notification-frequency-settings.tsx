'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { NotificationFrequency } from '@/lib/types/notification-frequency'

interface NotificationFrequencySettingsProps {
  preferences: any
  onUpdate: (preferences: any) => Promise<void>
}

export function NotificationFrequencySettings({ 
  preferences, 
  onUpdate 
}: NotificationFrequencySettingsProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [localPreferences, setLocalPreferences] = useState({
    notificationFrequency: preferences.notificationFrequency || NotificationFrequency.INSTANT,
    taskCompletedFrequency: preferences.taskCompletedFrequency || preferences.notificationFrequency || NotificationFrequency.INSTANT,
    statusChangedFrequency: preferences.statusChangedFrequency || preferences.notificationFrequency || NotificationFrequency.INSTANT,
    digestHour: preferences.digestHour || 9,
    digestDayOfWeek: preferences.digestDayOfWeek || 1
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await onUpdate(localPreferences)
      toast({
        title: 'Preferences updated',
        description: 'Your notification frequency settings have been saved.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const frequencyOptions = [
    { value: NotificationFrequency.INSTANT, label: 'Instant - Send immediately' },
    { value: NotificationFrequency.DAILY, label: 'Daily Digest - Once per day' },
    { value: NotificationFrequency.WEEKLY, label: 'Weekly Digest - Once per week' },
    { value: NotificationFrequency.NEVER, label: 'Never - Do not send' }
  ]

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`
  }))

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  const showDigestSettings = 
    localPreferences.notificationFrequency === NotificationFrequency.DAILY ||
    localPreferences.notificationFrequency === NotificationFrequency.WEEKLY ||
    localPreferences.taskCompletedFrequency === NotificationFrequency.DAILY ||
    localPreferences.taskCompletedFrequency === NotificationFrequency.WEEKLY ||
    localPreferences.statusChangedFrequency === NotificationFrequency.DAILY ||
    localPreferences.statusChangedFrequency === NotificationFrequency.WEEKLY

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Frequency</CardTitle>
        <CardDescription>
          Control how often you receive email notifications. Choose between instant notifications or batched digests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Default Frequency */}
          <div className="space-y-2">
            <Label htmlFor="default-frequency">Default Notification Frequency</Label>
            <Select
              value={localPreferences.notificationFrequency}
              onValueChange={(value) => setLocalPreferences(prev => ({ 
                ...prev, 
                notificationFrequency: value as NotificationFrequency 
              }))}
            >
              <SelectTrigger id="default-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This applies to all notifications unless overridden below
            </p>
          </div>

          {/* Task Completed Frequency */}
          <div className="space-y-2">
            <Label htmlFor="task-frequency">Task Completion Notifications</Label>
            <Select
              value={localPreferences.taskCompletedFrequency}
              onValueChange={(value) => setLocalPreferences(prev => ({ 
                ...prev, 
                taskCompletedFrequency: value as NotificationFrequency 
              }))}
            >
              <SelectTrigger id="task-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Changed Frequency */}
          <div className="space-y-2">
            <Label htmlFor="status-frequency">Status Update Notifications</Label>
            <Select
              value={localPreferences.statusChangedFrequency}
              onValueChange={(value) => setLocalPreferences(prev => ({ 
                ...prev, 
                statusChangedFrequency: value as NotificationFrequency 
              }))}
            >
              <SelectTrigger id="status-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Digest Settings */}
          {showDigestSettings && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Digest Settings</h4>
              
              {/* Digest Hour */}
              <div className="space-y-2">
                <Label htmlFor="digest-hour">Daily Digest Time</Label>
                <Select
                  value={localPreferences.digestHour.toString()}
                  onValueChange={(value) => setLocalPreferences(prev => ({ 
                    ...prev, 
                    digestHour: parseInt(value) 
                  }))}
                >
                  <SelectTrigger id="digest-hour">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Digest Day */}
              <div className="space-y-2">
                <Label htmlFor="digest-day">Weekly Digest Day</Label>
                <Select
                  value={localPreferences.digestDayOfWeek.toString()}
                  onValueChange={(value) => setLocalPreferences(prev => ({ 
                    ...prev, 
                    digestDayOfWeek: parseInt(value) 
                  }))}
                >
                  <SelectTrigger id="digest-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Frequency Settings
        </Button>
      </CardContent>
    </Card>
  )
}