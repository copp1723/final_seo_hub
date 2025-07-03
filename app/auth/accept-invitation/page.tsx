'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Clock, Mail, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

interface Invitation {
  id: string
  email: string
  name?: string
  role: string
  message?: string
  status: 'pending' | 'accepted' | 'expired'
  agency: {
    id: string
    name: string
  }
  inviter: {
    name?: string
    email: string
  }
}

export default function AcceptInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/auth/accept-invitation?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invitation')
      }

      setInvitation(data.invitation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      setSuccess(data.message || 'Invitation accepted successfully!')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/auth/signin')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  const needsSignIn = sessionStatus === 'unauthenticated' || 
    (sessionStatus === 'authenticated' && session?.user?.email?.toLowerCase() !== invitation.email.toLowerCase())

  const inviterName = invitation.inviter.name || invitation.inviter.email

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {invitation.status === 'accepted' ? 'Invitation Already Accepted' : 
             invitation.status === 'expired' ? 'Invitation Expired' : 
             'You\'re Invited!'}
          </CardTitle>
          <CardDescription>
            {invitation.status === 'pending' && 
              `${inviterName} has invited you to join ${invitation.agency.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation.status === 'accepted' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation has already been accepted.
              </AlertDescription>
            </Alert>
          ) : invitation.status === 'expired' ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This invitation has expired. Please contact {inviterName} for a new invitation.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{invitation.email}</span>
                </div>
                {invitation.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{invitation.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{invitation.role.toLowerCase().replace('_', ' ')}</span>
                </div>
              </div>

              {invitation.message && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600 mb-1">Message from {inviterName}:</p>
                  <p className="text-sm">{invitation.message}</p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {needsSignIn ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription>
                      Please sign in with {invitation.email} to accept this invitation.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/auth/accept-invitation?token=${token}`)}`)}
                    className="w-full"
                  >
                    Sign In to Accept
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleAcceptInvitation}
                  disabled={accepting || !!success}
                  className="w-full"
                >
                  {accepting ? 'Accepting...' : 'Accept Invitation'}
                </Button>
              )}
            </>
          )}

          {invitation.status !== 'pending' && (
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}