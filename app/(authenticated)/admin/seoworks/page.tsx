'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SeoworksAdminPage() {
  const [externalIdsText, setExternalIdsText] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [log, setLog] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const append = (msg: string) => setLog(prev => [...prev, msg])

  const parseIds = (): string[] => (
    externalIdsText
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(Boolean)
  )

  const checkOrphaned = async () => {
    setIsRunning(true)
    setLog([])
    const ids = parseIds()
    if (ids.length === 0) {
      append('No externalIds provided')
      setIsRunning(false)
      return
    }
    for (const id of ids) {
      try {
        const res = await fetch(`/api/seoworks/orphaned?externalId=${encodeURIComponent(id)}`)
        const json = await res.json()
        append(`ID ${id}: ${json?.data?.total ?? 0} orphaned record(s) found`)
      } catch (e) {
        append(`ID ${id}: error`)
      }
    }
    setIsRunning(false)
  }

  const processIds = async () => {
    setIsRunning(true)
    setLog([])
    const ids = parseIds()
    if (ids.length === 0) {
      append('No externalIds provided')
      setIsRunning(false)
      return
    }
    for (const id of ids) {
      try {
        const res = await fetch('/api/seoworks/process-orphaned-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ externalId: id })
        })
        const json = await res.json()
        append(`Processed ${id}: processed=${json?.data?.processed ?? '?'} created=${json?.data?.created ?? '?'}`)
      } catch (e) {
        append(`Processed ${id}: error`)
      }
    }
    setIsRunning(false)
  }

  const processByUserEmail = async () => {
    if (!userEmail) {
      append('Enter a userEmail')
      return
    }
    setIsRunning(true)
    setLog([])
    try {
      const res = await fetch('/api/seoworks/process-orphaned-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      })
      const json = await res.json()
      append(`Processed for ${userEmail}: processed=${json?.data?.processed ?? '?'} created=${json?.data?.created ?? '?'}`)
    } catch (e) {
      append('Error processing by userEmail')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SEOWorks Orphaned Task Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">External IDs (comma or newline separated)</label>
            <textarea
              className="w-full border rounded p-2 h-32"
              value={externalIdsText}
              onChange={(e) => setExternalIdsText(e.target.value)}
              placeholder="e.g. 140745, 140746, 72287"
            />
            <div className="flex gap-2">
              <Button disabled={isRunning} onClick={checkOrphaned}>Check Orphaned</Button>
              <Button disabled={isRunning} onClick={processIds} variant="secondary">Process IDs</Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Process by User Email</label>
            <div className="flex gap-2">
              <Input
                placeholder="integration-user@dealership.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <Button disabled={isRunning} onClick={processByUserEmail}>Process</Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Log</label>
            <pre className="bg-gray-50 border rounded p-2 whitespace-pre-wrap text-sm min-h-[120px]">{log.join('\n')}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


