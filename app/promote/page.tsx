'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface SessionUser {
  id: string
  email: string
  role: string
  agencyId?: string | null
}

export default function PromotePage() {
  const { data: session } = useSession()
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'idle'>('idle')
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    if (session?.user) {
      setCurrentUser(session.user as SessionUser)
      checkCurrentStatus()
    }
  }, [session])

  const checkCurrentStatus = async () => {
    setStatus('checking')
    setMessage('Checking current status...')
    
    try {
      const response = await fetch('/api/debug/session')
      const data = await response.json()
      
      if (data.success && data.session) {
        const role = data.session.user.role
        const email = data.session.user.email
        const agencyId = data.session.user.agencyId
        
        setCurrentUser({
          id: data.session.user.id,
          email: email,
          role: role,
          agencyId: agencyId
        })
        
        if (role === 'SUPER_ADMIN') {
          setStatus('success')
          setMessage(`✅ You are already a SUPER_ADMIN!\n\nEmail: ${email}\nRole: ${role}\nAgency ID: ${agencyId || 'None (SUPER_ADMIN)'}`)
        } else {
          setStatus('idle')
          setMessage(`Current Status:\nEmail: ${email}\nRole: ${role}\nAgency ID: ${agencyId || 'None'}\n\n❌ You are NOT a SUPER_ADMIN yet.`)
        }
      } else {
        setStatus('error')
        setMessage('❌ Not logged in or session error')
      }
    } catch (error) {
      setStatus('error')
      setMessage(`❌ Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const promoteToSuperAdmin = async () => {
    setStatus('checking')
    setMessage('Promoting to SUPER_ADMIN...')
    
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.message) {
        setStatus('success')
        setMessage(`✅ Success! ${data.message}\n\nUpdated User:\nEmail: ${data.user.email}\nRole: ${data.user.role}\n\n🎉 You are now a SUPER_ADMIN!\nTry visiting /admin to see the admin dashboard.`)
        
        // Update current user state
        setCurrentUser(prev => prev ? { ...prev, role: 'SUPER_ADMIN' } : null)
        
        // Refresh the session to get updated role
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setStatus('error')
        setMessage(`❌ Failed to promote: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setStatus('error')
      setMessage(`❌ Error during promotion: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Super Admin Promotion</h1>
          <p className="text-gray-600">Please log in first to check your admin status.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Super Admin Promotion Tool</h1>
        <p className="text-gray-600 mb-6">
          This tool will promote your current logged-in account to SUPER_ADMIN role.
        </p>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={checkCurrentStatus}
            disabled={status === 'checking'}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'checking' ? 'Checking...' : 'Check Current Status'}
          </button>
          
          {currentUser?.role !== 'SUPER_ADMIN' && (
            <button
              onClick={promoteToSuperAdmin}
              disabled={status === 'checking'}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'checking' ? 'Promoting...' : 'Promote to Super Admin'}
            </button>
          )}
        </div>

        {message && (
          <div className={`p-4 rounded-md font-mono text-sm whitespace-pre-line ${
            status === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : status === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        {currentUser?.role === 'SUPER_ADMIN' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-green-800 mb-2">🎉 Super Admin Access Granted!</h3>
            <p className="text-green-700 mb-3">You now have full access to all admin features:</p>
            <ul className="list-disc list-inside text-green-700 mb-4 space-y-1">
              <li>Create and manage agencies</li>
              <li>View all users and requests system-wide</li>
              <li>Access all dashboards and analytics</li>
              <li>No restrictions on platform features</li>
            </ul>
            <a
              href="/admin"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Go to Admin Dashboard →
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Session Info:</h3>
          {currentUser && (
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Role:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  currentUser.role === 'SUPER_ADMIN' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentUser.role}
                </span>
              </p>
              <p><strong>Agency ID:</strong> {currentUser.agencyId || 'None'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 