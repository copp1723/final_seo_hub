'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Building2, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Dealership {
  id: string
  name: string
}

interface DealershipData {
  currentDealership: Dealership | null
  availableDealerships: Dealership[]
}

export function DealershipSelector() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [dealershipData, setDealershipData] = useState<DealershipData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch dealerships on component mount
  useEffect(() => {
    const fetchDealerships = async () => {
      if (!session?.user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/dealerships/switch')
        if (!response.ok) {
          throw new Error('Failed to fetch dealerships')
        }

        const data: DealershipData = await response.json()
        setDealershipData(data)
      } catch (err) {
        console.error('Error fetching dealerships:', err)
        setError('Failed to load dealerships')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDealerships()
  }, [session?.user?.id])

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleDealershipSwitch = async (dealershipId: string) => {
    if (isSwitching) return

    setIsSwitching(true)
    setError(null)

    try {
      const response = await fetch('/api/dealerships/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dealershipId }),
      })

      if (!response.ok) {
        throw new Error('Failed to switch dealership')
      }

      const result = await response.json()

      // Update the session to reflect the new dealership
      await update({
        dealershipId: result.dealership.id
      })

      // Update local state
      setDealershipData(prev => prev ? {
        ...prev,
        currentDealership: result.dealership
      } : null)

      setIsOpen(false)

      // Refresh the page to update all dealership-specific data
      router.refresh()

    } catch (err) {
      console.error('Error switching dealership:', err)
      setError('Failed to switch dealership')
    } finally {
      setIsSwitching(false)
    }
  }

  // Don't render if user doesn't have access to multiple dealerships
  if (!session?.user?.agencyId || !dealershipData?.availableDealerships?.length) {
    return null
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600">
        <Building2 className="h-4 w-4" />
        <span>{error}</span>
      </div>
    )
  }

  const currentDealership = dealershipData.currentDealership
  const availableDealerships = dealershipData.availableDealerships

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          "flex items-center space-x-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
          "border border-gray-200 bg-white hover:bg-gray-50",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isSwitching && "opacity-50 cursor-not-allowed"
        )}
      >
        {isSwitching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-gray-500" />
        )}
        
        <span className="text-gray-700 max-w-[120px] lg:max-w-[150px] truncate text-xs lg:text-sm">
          {currentDealership?.name || 'Select Dealership'}
        </span>
        
        <ChevronDown 
          className={cn(
            "h-3 w-3 text-gray-500 transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              Select Dealership
            </div>
            
            {availableDealerships.map((dealership) => {
              const isSelected = currentDealership?.id === dealership.id
              
              return (
                <button
                  key={dealership.id}
                  onClick={() => handleDealershipSwitch(dealership.id)}
                  disabled={isSwitching || isSelected}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left",
                    "hover:bg-gray-50 focus:outline-none focus:bg-gray-50",
                    isSelected && "bg-blue-50 text-blue-700",
                    (isSwitching && !isSelected) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{dealership.name}</span>
                  </span>
                  
                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}