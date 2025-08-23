'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { ChevronDown, Building, Check, Loader2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Agency {
  id: string
  name: string
  dealershipCount: number
}

interface AgencySelectorProps {
  onAgencyChange?: (agency: Agency | null) => void
}

export function AgencySelector({ onAgencyChange }: AgencySelectorProps) {
  const { user, refreshSession } = useAuth()
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null)
  const [availableAgencies, setAvailableAgencies] = useState<Agency[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Only show for SUPER_ADMIN users
  if (user?.role !== 'SUPER_ADMIN') {
    return null
  }

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch agencies when component mounts
  useEffect(() => {
    if (!mounted || !user?.id) return

    const fetchAgencies = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/agencies/select', {
          credentials: 'include'
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch agencies (${response.status})`)
        }

        const data = await response.json()
        setAvailableAgencies(data.agencies || [])
        setCurrentAgency(data.currentAgency || null)
        
        // Notify parent component
        if (onAgencyChange) {
          onAgencyChange(data.currentAgency || null)
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agencies')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgencies()
  }, [mounted, user?.id, onAgencyChange])

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

  const handleAgencySwitch = async (agencyId: string) => {
    setIsSwitching(true)
    setError(null)

    try {
      const response = await fetch('/api/agencies/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ agencyId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to switch agency')
      }

      const data = await response.json()
      const selectedAgency = availableAgencies.find(a => a.id === agencyId) || null
      
      setCurrentAgency(selectedAgency)
      setIsOpen(false)
      
      // Show message if integrations were cleared
      if (data.connectionsCleared) {
        // Create a temporary notification that will be visible to user
        const notification = document.createElement('div')
        notification.innerHTML = `
          <div style="
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: #ef4444; 
            color: white; 
            padding: 12px 20px; 
            border-radius: 8px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            max-width: 400px;
          ">
            ⚠️ GA4/Search Console connections cleared. Please reconnect for this agency.
          </div>
        `
        document.body.appendChild(notification)
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 5000)
      }
      
      // Notify parent component
      if (onAgencyChange) {
        onAgencyChange(selectedAgency)
      }

      // Refresh session to reload dealership data
      await refreshSession()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch agency')
    } finally {
      setIsSwitching(false)
    }
  }

  // Don't render until mounted
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
        <span className="text-sm text-gray-500">Loading agencies...</span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <Building className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-500">{error}</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          "flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:ring-offset-2",
          isSwitching && "opacity-50 cursor-not-allowed"
        )}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <Building className="h-4 w-4 text-purple-500" />
        )}
        <div className="flex items-center min-w-0">
          <span className="text-xs text-gray-600 max-w-[100px] lg:max-w-[140px] truncate font-normal">
            {isSwitching ? 'Switching...' : (currentAgency?.name || 'Select Agency')}
          </span>
        </div>
        
        <ChevronDown
          className={cn(
            "h-3 w-3 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-lg py-1 bg-white backdrop-blur-md ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200/60" style={{ zIndex: 110 }}>
          <div className="px-3 py-2 border-b border-gray-200/60">
            <p className="text-sm font-normal text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2 text-purple-500" />
              Select Agency
            </p>
            <p className="text-xs text-gray-400">{availableAgencies.length} available agencies</p>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {availableAgencies.map((agency) => {
              const isSelected = currentAgency?.id === agency.id
              
              return (
                <button
                  key={agency.id}
                  onClick={() => handleAgencySwitch(agency.id)}
                  disabled={isSwitching}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors duration-200",
                    "hover:bg-gray-50/80 focus:outline-none focus:bg-gray-50/80",
                    isSelected && "bg-purple-50/80 text-purple-700",
                    isSwitching && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center ring-1 ring-white shadow-sm">
                      <Building className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-normal text-gray-700 truncate">{agency.name}</span>
                      <span className="text-xs text-gray-400">{agency.dealershipCount} dealerships</span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <Check className="h-4 w-4 text-purple-600 flex-shrink-0" />
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