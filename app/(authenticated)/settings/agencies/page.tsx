'use client'

// This is a redirect page to maintain backwards compatibility
// All agency management is now in the unified settings page
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgenciesSettingsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/settings?tab=agencies')
  }, [router])
  
  return null
}