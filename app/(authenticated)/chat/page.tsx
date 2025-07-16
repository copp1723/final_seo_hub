'use client'

import { useAuth } from '@/app/simple-auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AutomotiveSEOChat } from '@/components/chat/automotive-seo-chat'
import { PageLoading } from '@/components/ui/loading'

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Demo dealership info - in production this would come from session/database
  const dealershipInfo = {
    currentPackage: 'gold' as const
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/auth/simple-signin')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <PageLoading />
  }

  if (!user) {
    return null
  }

  return (
    <div className="h-full">
      <AutomotiveSEOChat dealershipInfo={dealershipInfo} />
    </div>
  )
}