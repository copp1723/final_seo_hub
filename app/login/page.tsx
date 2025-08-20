'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [status, setStatus] = useState('Logging you in...')
  const router = useRouter()

  useEffect(() => {
    const autoLogin = async () => {
      try {
        setStatus('Creating session...')
        
        // Call the auto-login endpoint
        const response = await fetch('/api/debug/auto-login', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          setStatus('Success! Redirecting to dashboard...')
          // Small delay to show success message
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        } else {
          setStatus('Login failed. Trying alternative method...')
          // Fallback: redirect to the endpoint directly
          window.location.href = '/api/debug/auto-login'
        }
      } catch (error) {
        console.error('Auto-login error:', error)
        setStatus('Error occurred. Redirecting...')
        // Fallback: redirect to the endpoint directly
        window.location.href = '/api/debug/auto-login'
      }
    }

    autoLogin()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">GSEO Hub</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  )
}
