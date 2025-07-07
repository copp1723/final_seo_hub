'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AutomotiveSEOChat } from '@/components/chat/automotive-seo-chat'
import { PageLoading } from '@/components/ui/loading'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Demo dealership info - in production this would come from session/database
  const dealershipInfo = {
    brand: 'Toyota',
    location: 'Dallas, TX',
    inventorySize: 450,
    currentPackage: 'gold' as const
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <PageLoading />
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AutomotiveSEOChat dealershipInfo={dealershipInfo} />
    </div>
  )
}