'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface SelectedDealershipContextValue {
  selectedDealership: string | null
  setSelectedDealership: (id: string | null) => void
}

const SelectedDealershipContext = createContext<SelectedDealershipContextValue | undefined>(undefined)

export function SelectedDealershipProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialDealership = searchParams.get('dealershipId')
  const [selectedDealership, setSelected] = useState<string | null>(initialDealership)

  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (selectedDealership) {
      params.set('dealershipId', selectedDealership)
    } else {
      params.delete('dealershipId')
    }
    router.replace(`?${params.toString()}`)
  }, [selectedDealership])

  return (
    <SelectedDealershipContext.Provider value={{ selectedDealership, setSelectedDealership }}>
      {children}
    </SelectedDealershipContext.Provider>
  )
}

export function useSelectedDealership() {
  const context = useContext(SelectedDealershipContext)
  if (!context) {
    throw new Error('useSelectedDealership must be used within SelectedDealershipProvider')
  }
  return context
} 