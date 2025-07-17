'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
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
  const { user, refreshSession } = useAuth()
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
      if (!user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/dealerships/switch')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch dealerships (${response.status})`)
        }

        const data: DealershipData = await response.json()
        console.log('Dealership data received:', data) // Debug log
        
        // Handle empty dealership arrays gracefully
        if (!data.availableDealerships?.length) {
          console.warn('No dealerships found for user')
          setDealershipData({
            currentDealership: null,
            availableDealerships: []
          })
        } else {
          setDealershipData(data)
          console.log(`Found ${data.availableDealerships.length} dealerships`)
        }
      } catch (err) {
        console.error('Error fetching dealerships:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dealerships')
        
        // Set empty dealership data to prevent null reference errors
        setDealershipData({
          currentDealership: null,
          availableDealerships: []
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDealerships()
  }, [user?.id])

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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dealershipId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to switch dealership')
      }

      const result = await response.json()

      // Update local state
      setDealershipData(prev => prev ? {
       ...prev,
        currentDealership: result.dealership
      } : null)

      setIsOpen(false)

      // Refresh the session and page to update all dealership-specific data
      await refreshSession()
      router.refresh()

    } catch (err) {
      console.error('Error switching dealership:', err)
      setError(err instanceof Error ? err.message : 'Failed to switch dealership')
    } finally {
      setIsSwitching(false)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50/80 transition-colors duration-200">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500 font-normal">Loading...</span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-50/80 text-red-600 border border-red-200/50">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-normal">{error}</span>
      </div>
    )
  }

  // Don't render if no dealership data available
  if (!dealershipData?.availableDealerships?.length) {
    console.log('No dealerships available to display') // Debug log
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50/80">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400 font-normal">No dealerships</span>
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
          "flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2",
          isSwitching && "opacity-50 cursor-not-allowed"
        )}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-500" />
        )}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-xs font-normal text-gray-400 uppercase tracking-wide">
            SELECT DEALERSHIP
          </span>
          <span className="text-sm text-gray-600 max-w-[120px] lg:max-w-[200px] truncate font-normal">
            {currentDealership?.name || `${availableDealerships.length} Available`}
          </span>
        </div>
        
        <ChevronDown 
          className={cn(
            "h-3 w-3 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu - Fixed positioning and z-index */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl shadow-lg py-1 bg-white backdrop-blur-md ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200/60" style={{ zIndex: 9999 }}>
          <div className="px-4 py-3 border-b border-gray-200/60">
            <p className="text-sm font-normal text-gray-600">Select Dealership</p>
            <p className="text-xs text-gray-400">{availableDealerships.length} available</p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {availableDealerships.map((dealership) => {
              const isSelected = currentDealership?.id === dealership.id
              
              return (
                <button
                  key={dealership.id}
                  onClick={() => handleDealershipSwitch(dealership.id)}
                  disabled={isSwitching}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors duration-200",
                    "hover:bg-gray-50/80 focus:outline-none focus:bg-gray-50/80",
                    isSelected && "bg-blue-50/80 text-blue-700",
                    isSwitching && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-white shadow-sm">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-normal text-gray-700 truncate">{dealership.name}</span>
                      <span className="text-xs text-gray-400">Dealership ID: {dealership.id.slice(-8)}</span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
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
