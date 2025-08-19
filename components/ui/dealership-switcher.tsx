'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DealershipAccess {
  dealershipId: string
  dealershipName: string
  accessLevel: 'READ' | 'WRITE' | 'ADMIN'
  agencyId: string
  agencyName: string
}

interface DealershipContext {
  currentDealershipId: string | null
  availableDealerships: DealershipAccess[]
}

export default function DealershipSwitcher() {
  const { user } = useAuth()
  const router = useRouter()
  const [context, setContext] = useState<DealershipContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (!user) return
    
    // Only show for users who might have multi-dealership access
    if (user.role === 'USER' || user.role === 'DEALERSHIP_ADMIN') {
      fetchDealershipContext()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchDealershipContext = async () => {
    try {
      const response = await fetch('/api/user/switch-dealership')
      if (!response.ok) {
        throw new Error('Failed to fetch dealership context')
      }

      const data = await response.json()
      setContext({
        currentDealershipId: data.currentDealershipId,
        availableDealerships: data.availableDealerships || []
      })
    } catch (error) {
      console.error('Error fetching dealership context:', error)
      // Don't show error for users without multi-dealership access
    } finally {
      setLoading(false)
    }
  }

  const switchDealership = async (dealershipId: string) => {
    if (!context || dealershipId === context.currentDealershipId) return

    setSwitching(true)
    try {
      const response = await fetch('/api/user/switch-dealership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealershipId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to switch dealership')
      }

      const data = await response.json()
      
      // Update context
      setContext(prev => prev ? {
        ...prev,
        currentDealershipId: dealershipId
      } : null)

      const selectedDealership = context.availableDealerships.find(d => d.dealershipId === dealershipId)
      toast.success(`Switched to ${selectedDealership?.dealershipName || 'selected dealership'}`)
      
      // Refresh the page to update all components with new dealership context
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSwitching(false)
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'READ': return 'bg-blue-100 text-blue-800'
      case 'WRITE': return 'bg-yellow-100 text-yellow-800'
      case 'ADMIN': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case 'READ': return 'Read'
      case 'WRITE': return 'Write'
      case 'ADMIN': return 'Admin'
      default: return level
    }
  }

  // Don't render if loading or user doesn't have access to multiple dealerships
  if (loading || !context || context.availableDealerships.length <= 1) {
    return null
  }

  const currentDealership = context.availableDealerships.find(
    d => d.dealershipId === context.currentDealershipId
  )

  return (
    <div className="flex items-center space-x-2">
      <Building2 className="h-4 w-4 text-gray-500" />
      <Select
        value={context.currentDealershipId || ''}
        onValueChange={switchDealership}
        disabled={switching}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select dealership">
            {currentDealership ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 text-left">
                  <div className="font-medium">{currentDealership.dealershipName}</div>
                  <div className="text-xs text-gray-500">{currentDealership.agencyName}</div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs ${getAccessLevelColor(currentDealership.accessLevel)}`}
                >
                  {getAccessLevelLabel(currentDealership.accessLevel)}
                </Badge>
              </div>
            ) : (
              'Select dealership'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {context.availableDealerships.map((dealership) => (
            <SelectItem 
              key={dealership.dealershipId} 
              value={dealership.dealershipId}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1">
                  <div className="font-medium">{dealership.dealershipName}</div>
                  <div className="text-xs text-gray-500">{dealership.agencyName}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getAccessLevelColor(dealership.accessLevel)}`}
                  >
                    {getAccessLevelLabel(dealership.accessLevel)}
                  </Badge>
                  {dealership.dealershipId === context.currentDealershipId && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {switching && (
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
      )}
    </div>
  )
}