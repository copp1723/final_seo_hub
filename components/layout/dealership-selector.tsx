'use client'

import { useState, useEffect, useRef } from 'react'
import { useDealership, type Dealership } from '@/app/context/DealershipContext'
import { ChevronDown, Building2, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealershipSelectorProps {
  showOnAllPages?: boolean
}

export function DealershipSelector({ showOnAllPages = false }: DealershipSelectorProps) {
  const {
    currentDealership,
    availableDealerships,
    isLoading,
    isSwitching,
    error,
    switchDealership
  } = useDealership()
  
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

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
    const success = await switchDealership(dealershipId)
    if (success) {
      setIsOpen(false)
    }
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-500">{error}</span>
      </div>
    )
  }

  // Don't render if no dealership data available
  if (!availableDealerships?.length) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">No dealerships</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          "flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2",
          isSwitching && "opacity-50 cursor-not-allowed"
        )}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-500" />
        )}
        <div className="flex items-center min-w-0">
          <span className="text-xs text-gray-600 max-w-[80px] lg:max-w-[120px] truncate font-normal">
            {currentDealership?.name || 'Select Dealership'}
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
        <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl shadow-lg py-1 bg-white backdrop-blur-md ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200/60" style={{ zIndex: 100 }}>
          <div className="px-3 py-2 border-b border-gray-200/60">
            <p className="text-sm font-normal text-gray-600">Select Dealership</p>
            <p className="text-xs text-gray-400">{availableDealerships.length} available</p>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {availableDealerships.map((dealership: Dealership) => {
              const isSelected = currentDealership?.id === dealership.id
              
              return (
                <button
                  key={dealership.id}
                  onClick={() => handleDealershipSwitch(dealership.id)}
                  disabled={isSwitching}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors duration-200",
                    "hover:bg-gray-50/80 focus:outline-none focus:bg-gray-50/80",
                    isSelected && "bg-blue-50/80 text-blue-700",
                    isSwitching && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-1 ring-white shadow-sm">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-normal text-gray-700 truncate">{dealership.name}</span>
                      <span className="text-xs text-gray-400">ID: {dealership.id.slice(-8)}</span>
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
