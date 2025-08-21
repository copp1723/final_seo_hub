'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { logger } from '@/lib/logger'

export interface Dealership {
  id: string
  name: string
  activePackageType?: 'SILVER' | 'GOLD' | 'PLATINUM'
  // Add other properties as needed
}

interface DealershipContextType {
  currentDealership: Dealership | null
  availableDealerships: Dealership[]
  isLoading: boolean
  isSwitching: boolean
  error: string | null
  switchDealership: (dealershipId: string) => Promise<boolean>
  refreshDealerships: () => Promise<void>
}

const DealershipContext = createContext<DealershipContextType | undefined>(undefined)

export function useDealership() {
  const context = useContext(DealershipContext)
  if (context === undefined) {
    throw new Error('useDealership must be used within a DealershipProvider')
  }
  return context
}

export function DealershipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentDealership, setCurrentDealership] = useState<Dealership | null>(null)
  const [availableDealerships, setAvailableDealerships] = useState<Dealership[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true)
    
    // Check localStorage for previously selected dealership
    if (typeof window !== 'undefined') {
      const savedDealershipId = localStorage.getItem('selectedDealershipId')
      if (savedDealershipId) {
        logger.info('Found saved dealership ID in localStorage', { dealershipId: savedDealershipId })
      }
    }
  }, [])

  // Fetch dealerships when user changes or on mount
  const fetchDealerships = async () => {
    if (!mounted || !user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dealerships/switch', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch dealerships (${response.status})`)
      }

      const data = await response.json()
      
      // Handle empty dealership arrays gracefully
      if (!data.availableDealerships?.length) {
        setAvailableDealerships([])
        setCurrentDealership(null)
        // Clear localStorage if no dealerships available
        localStorage.removeItem('selectedDealershipId')
      } else {
        console.log('📋 DEALERSHIP FETCH - Available Dealerships:', {
          count: data.availableDealerships.length,
          dealerships: data.availableDealerships.map((d: Dealership) => ({ id: d.id, name: d.name })),
          serverCurrentDealership: data.currentDealership,
          timestamp: new Date().toISOString()
        })
        setAvailableDealerships(data.availableDealerships)
        
        // If no current dealership from server, check localStorage
        if (!data.currentDealership && typeof window !== 'undefined') {
          const savedDealershipId = localStorage.getItem('selectedDealershipId')
          if (savedDealershipId) {
            const savedDealership = data.availableDealerships.find((d: Dealership) => d.id === savedDealershipId)
            if (savedDealership) {
              setCurrentDealership(savedDealership)
              logger.info('Restored dealership from localStorage', { dealershipId: savedDealershipId })
            } else {
              // Saved dealership no longer available, clear it
              localStorage.removeItem('selectedDealershipId')
              setCurrentDealership(data.currentDealership)
            }
          } else {
            setCurrentDealership(data.currentDealership)
          }
        } else {
          console.log('🎯 DEALERSHIP FETCH - Setting Current Dealership:', {
            dealership: data.currentDealership,
            source: 'server',
            timestamp: new Date().toISOString()
          })
          setCurrentDealership(data.currentDealership)
          // Sync localStorage with server's current dealership
          if (data.currentDealership?.id) {
            localStorage.setItem('selectedDealershipId', data.currentDealership.id)
          }
        }
      }
    } catch (err) {
      logger.error('Error fetching dealerships:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dealerships')
      // Set empty arrays on error to prevent null reference errors
      setAvailableDealerships([])
      setCurrentDealership(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch on mount or when user changes
  useEffect(() => {
    fetchDealerships()
  }, [user?.id, mounted])

  const switchDealership = async (dealershipId: string): Promise<boolean> => {
    if (isSwitching || !dealershipId) return false

    setIsSwitching(true)
    setError(null)

    try {
      const response = await fetch('/api/dealerships/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ dealershipId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to switch dealership')
      }

      const result = await response.json()
      
      // Update current dealership immediately for instant UI feedback
      const newDealership = availableDealerships.find(d => d.id === dealershipId)
      if (newDealership) {
        console.log('🔄 DEALERSHIP SWITCH - Context Update:', {
          from: { id: currentDealership?.id, name: currentDealership?.name },
          to: { id: newDealership.id, name: newDealership.name },
          availableCount: availableDealerships.length,
          timestamp: new Date().toISOString()
        })
        setCurrentDealership(newDealership)
        // Save to localStorage for persistence across page loads and API calls
        localStorage.setItem('selectedDealershipId', dealershipId)
      }

      // Dispatch event for components that need to react to dealership changes
      // Make synchronous to avoid race conditions with data fetching
      window.dispatchEvent(new CustomEvent('dealershipChanged', {
        detail: { 
          dealership: result.dealership,
          previousDealership: currentDealership,
          invalidateCache: true,
          timestamp: Date.now()
        }
      }))

      logger.info('Dealership switched successfully', {
        from: currentDealership?.id,
        to: dealershipId,
        dealershipName: result.dealership.name
      })

      return true
    } catch (err) {
      logger.error('Error switching dealership:', err)
      setError(err instanceof Error ? err.message : 'Failed to switch dealership')
      return false
    } finally {
      setIsSwitching(false)
    }
  }

  const refreshDealerships = async () => {
    await fetchDealerships()
  }

  const contextValue: DealershipContextType = {
    currentDealership,
    availableDealerships,
    isLoading,
    isSwitching,
    error,
    switchDealership,
    refreshDealerships
  }

  return (
    <DealershipContext.Provider value={contextValue}>
      {children}
    </DealershipContext.Provider>
  )
}