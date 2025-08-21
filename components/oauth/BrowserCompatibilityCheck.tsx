'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface CompatibilityIssue {
  type: 'warning' | 'error'
  message: string
  solution: string
}

export function BrowserCompatibilityCheck() {
  const [issues, setIssues] = useState<CompatibilityIssue[]>([])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkBrowserCompatibility()
  }, [])

  const checkBrowserCompatibility = () => {
    const detectedIssues: CompatibilityIssue[] = []

    // Check for third-party cookie support
    if (navigator.cookieEnabled) {
      // Test if third-party cookies are blocked
      const testCookie = 'oauth_test=1; SameSite=None; Secure'
      document.cookie = testCookie
      
      if (!document.cookie.includes('oauth_test=1')) {
        detectedIssues.push({
          type: 'warning',
          message: 'Third-party cookies may be blocked',
          solution: 'Enable cookies for this site or try incognito mode'
        })
      } else {
        // Clean up test cookie
        document.cookie = 'oauth_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }

    // Check for common ad blockers
    const adBlockerTest = document.createElement('div')
    adBlockerTest.innerHTML = '&nbsp;'
    adBlockerTest.className = 'adsbox'
    document.body.appendChild(adBlockerTest)
    
    setTimeout(() => {
      if (adBlockerTest.offsetHeight === 0) {
        detectedIssues.push({
          type: 'warning',
          message: 'Ad blocker detected',
          solution: 'Temporarily disable ad blocker for OAuth connections'
        })
      }
      document.body.removeChild(adBlockerTest)
      setIssues(detectedIssues)
      setIsChecking(false)
    }, 100)
  }

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        Checking browser compatibility...
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        Browser is compatible with OAuth connections
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <div key={index} className={`flex items-start gap-2 p-3 rounded-lg ${
          issue.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
        }`}>
          {issue.type === 'error' ? (
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-sm">
            <div className="font-medium">{issue.message}</div>
            <div className="mt-1 opacity-90">{issue.solution}</div>
          </div>
        </div>
      ))}
      
      <div className="mt-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
        <div className="font-medium">Quick fixes:</div>
        <ul className="mt-1 space-y-1 list-disc list-inside opacity-90">
          <li>Try connecting in an incognito/private window</li>
          <li>Temporarily disable browser extensions</li>
          <li>Allow cookies for this site in your browser settings</li>
        </ul>
      </div>
    </div>
  )
}
