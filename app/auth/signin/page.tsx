'use client'

import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageLoading } from '@/components/ui/loading'
import { AuthLayout } from '@/components/layout/auth-layout'
import { useBranding } from '@/hooks/use-branding'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleRequestAccess = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setMessage('Access request sent! Check your email for a login link.')
        setEmail('')
      } else {
        setMessage('Failed to send access request. Please try again.')
      }
    } catch (error) {
      setMessage('Failed to send access request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleRequestAccess()}
          disabled={isLoading}
        />
        <Button
          onClick={handleRequestAccess}
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Request Access'}
        </Button>
      </div>
      
      {message && (
        <div className={`text-sm p-3 rounded-md ${
          message.includes('sent') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="text-center text-sm text-gray-600">
        <p>This is an invitation-only platform.</p>
        <p>Already have an invitation link? Use it directly to access your account.</p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  const branding = useBranding()
  
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthLayout
        title={`Welcome to ${branding.companyName}`}
        subtitle="Request access to manage your SEO requests"
      >
        <SignInForm />
      </AuthLayout>
    </Suspense>
  )
}
