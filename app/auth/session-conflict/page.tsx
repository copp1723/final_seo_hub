'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/simple-auth-provider'

export default function SessionConflictPage() {
  const { user, signOut } = useAuth()
  const params = useSearchParams()
  const [targetEmail, setTargetEmail] = useState<string | null>(null)

  useEffect(() => {
    const e = params.get('email')
    if (e) setTargetEmail(e)
  }, [params])

  if (!targetEmail || !user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h1 className="text-xl font-semibold mb-4">Session Check</h1>
        <p className="text-sm text-gray-600">No conflict detected.</p>
      </div>
    )
  }

  const switchHref = `/api/auth/switch-user?email=${encodeURIComponent(targetEmail)}`

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-4">Account Conflict</h1>
      <p className="text-sm text-gray-700 mb-6">
        You are logged in as <strong>{user.email}</strong> but this link is for <strong>{targetEmail}</strong>.
      </p>
      <div className="space-y-3">
        <a href={switchHref} className="block w-full text-center rounded-md bg-blue-600 text-white py-2 hover:bg-blue-700 transition">
          Switch to {targetEmail}
        </a>
        <button onClick={() => signOut()} className="w-full border rounded-md py-2 text-sm font-medium hover:bg-gray-50">
          Sign Out
        </button>
        <a href="/dashboard" className="block w-full text-center text-sm text-gray-600 underline">
          Stay as {user.email}
        </a>
      </div>
      <p className="mt-6 text-xs text-gray-500">This avoids needing to clear cookies or use private browsing.</p>
    </div>
  )
}
