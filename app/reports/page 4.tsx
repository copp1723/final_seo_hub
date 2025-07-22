'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReportsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the correct reporting route
    router.replace('/reporting')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to reports...</p>
      </div>
    </div>
  )
}
