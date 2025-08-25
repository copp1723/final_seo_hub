'use client'

import { useAuth } from '@/app/simple-auth-provider'
import { useDealership } from '@/app/context/DealershipContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AutomotiveSEOChat } from '@/components/chat/automotive-seo-chat'
import { PageLoading } from '@/components/ui/loading'

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  const { currentDealership, isLoading: dealershipLoading } = useDealership()
  const router = useRouter()

  // Note: Authentication redirect is handled by middleware to prevent redirect loops

  if (isLoading || dealershipLoading) {
    return <PageLoading />
  }

  if (!user) {
    return null
  }

  // Convert dealership context to chat component format
  const dealershipInfo = currentDealership ? {
    brand: currentDealership.name,
    currentPackage: (currentDealership.activePackageType?.toLowerCase() || 'silver') as 'silver' | 'gold' | 'platinum'
  } : undefined

  return (
    <div className="h-full">
      <AutomotiveSEOChat dealershipInfo={dealershipInfo} />
    </div>
  )
}