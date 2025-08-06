'use client'

// This is a redirect page to maintain backwards compatibility
// All user management is now in the unified settings page
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UsersSettingsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/settings?tab=users')
  }, [router])
  
  return null
}