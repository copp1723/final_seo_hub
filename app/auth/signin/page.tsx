'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/loading'
import { GoogleIcon } from '@/components/icons'
import { AuthLayout } from '@/components/layout/auth-layout'

function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      variant="secondary"
      size="lg"
      className="w-full gap-3"
    >
      <GoogleIcon className="h-5 w-5" />
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthLayout 
        title="Welcome to Rylie SEO Hub"
        subtitle="Sign in to manage your SEO requests"
      >
        <SignInForm />
      </AuthLayout>
    </Suspense>
  )
}