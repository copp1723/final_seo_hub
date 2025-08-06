'use client'

// Redirect super-admin routes to unified settings
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/simple-auth-provider'

export default function SuperAdminRedirect() {
  const router = useRouter()
  const { user } = useAuth()
  
  useEffect(() => {
    // Redirect to settings with users tab for super admins
    if (user?.role === 'SUPER_ADMIN') {
      router.replace('/settings?tab=users')
    } else {
      router.replace('/settings')
    }
  }, [router, user])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to settings...</p>
      </div>
    </div>
  )
}