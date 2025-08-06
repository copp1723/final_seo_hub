'use client'

// Redirect super-admin/users to unified settings
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminUsersRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/settings?tab=users')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to user management...</p>
      </div>
    </div>
  )
}