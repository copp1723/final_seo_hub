'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useDealership, type Dealership } from '@/app/context/DealershipContext'
import { ChevronDown, Building2, Check, Loader2, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MultiDealershipSelectorProps {
  selectedDealershipIds: string[]
  onSelectionChange: (dealershipIds: string[]) => void
}

export function MultiDealershipSelector({ 
  selectedDealershipIds, 
  onSelectionChange 
}: MultiDealershipSelectorProps) {
  const { user } = useAuth()
  const {
    availableDealerships,
    isLoading,
    error,
  } = useDealership()
  
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Only show for AGENCY_ADMIN users with multiple dealerships
  if (user?.role !== 'AGENCY_ADMIN' || !availableDealerships || availableDealerships.length <= 1) {
    return null
  }

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

  const handleSelectAll = () => {
    const allIds = availableDealerships.map(d => d.id)
    onSelectionChange(allIds)
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const handleDealershipToggle = (dealershipId: string) => {
    if (selectedDealershipIds.includes(dealershipId)) {
      onSelectionChange(selectedDealershipIds.filter(id => id !== dealershipId))
    } else {
      onSelectionChange([...selectedDealershipIds, dealershipId])
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
        <span className="text-sm text-gray-500">Loading dealerships...</span>
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

  const allSelected = selectedDealershipIds.length === availableDealerships.length
  const someSelected = selectedDealershipIds.length > 0 && selectedDealershipIds.length < availableDealerships.length

  const getDisplayText = () => {
    if (selectedDealershipIds.length === 0) {
      return 'Select dealerships'
    } else if (allSelected) {
      return 'All dealerships'
    } else if (selectedDealershipIds.length === 1) {
      const dealership = availableDealerships.find(d => d.id === selectedDealershipIds[0])
      return dealership?.name || 'Selected dealership'
    } else {
      return `${selectedDealershipIds.length} dealerships`
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2"
        )}
      >
        <Building2 className="h-4 w-4 text-blue-500" />
        <div className="flex items-center min-w-0">
          <span className="text-sm text-gray-700 max-w-[150px] truncate font-normal">
            {getDisplayText()}
          </span>
        </div>
        
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Multi-Selection Dropdown Menu */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-lg py-1 bg-white backdrop-blur-md ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200/60" style={{ zIndex: 110 }}>
          <div className="px-3 py-2 border-b border-gray-200/60">
            <p className="text-sm font-medium text-gray-700 flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-blue-500" />
              Select Dealerships
            </p>
            <p className="text-xs text-gray-400">
              {selectedDealershipIds.length} of {availableDealerships.length} selected
            </p>
          </div>
          
          {/* Select All / Deselect All Controls */}
          <div className="px-3 py-2 border-b border-gray-200/60 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {availableDealerships.map((dealership: Dealership) => {
              const isSelected = selectedDealershipIds.includes(dealership.id)
              
              return (
                <button
                  key={dealership.id}
                  onClick={() => handleDealershipToggle(dealership.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors duration-200",
                    "hover:bg-gray-50/80 focus:outline-none focus:bg-gray-50/80",
                    isSelected && "bg-blue-50/80"
                  )}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Dealership Info */}
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-1 ring-white shadow-sm flex-shrink-0">
                      <Building2 className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "font-medium truncate",
                        isSelected ? "text-blue-700" : "text-gray-700"
                      )}>
                        {dealership.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {dealership.activePackageType || 'No package'} • ID: {dealership.id.slice(-8)}
                      </span>
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