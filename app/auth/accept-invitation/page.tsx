'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      return
    }

    fetch('/api/auth/accept-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setStatus('success')
        setTimeout(() => router.push('/auth/signin'), 2000)
      } else {
        setStatus('error')
      }
    })
    .catch(() => setStatus('error'))
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">
          {status === 'loading' && 'Processing...'}
          {status === 'success' && 'Welcome! Redirecting...'}
          {status === 'error' && 'Invalid Invitation'}
        </h2>
        {status === 'loading' && <div className="animate-spin h-8 w-8 border-2 border-blue-600 rounded-full mx-auto"></div>}
      </div>
    </div>
  )
}