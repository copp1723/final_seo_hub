# Quick Start: Fix Dealership Data Isolation

## The Problem You're Facing
When you switch dealerships in the dropdown, the data doesn't update everywhere. Some components show old dealership data, others refresh randomly.

## Quick Fix Implementation (2-3 hours)

### Step 1: Create Dealership Context (30 min)

```typescript
// lib/contexts/dealership-context.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface Dealership {
  id: string
  name: string
}

interface DealershipContextType {
  currentDealership: Dealership | null
  availableDealerships: Dealership[]
  switchDealership: (dealershipId: string) => Promise<void>
  isLoading: boolean
}

const DealershipContext = createContext<DealershipContextType | undefined>(undefined)

export function DealershipProvider({ 
  children,
  initialDealership,
  availableDealerships 
}: {
  children: ReactNode
  initialDealership: Dealership | null
  availableDealerships: Dealership[]
}) {
  const [currentDealership, setCurrentDealership] = useState(initialDealership)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const switchDealership = async (dealershipId: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/dealerships/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealershipId })
      })

      if (response.ok) {
        const { dealership } = await response.json()
        setCurrentDealership(dealership)
        
        // Trigger re-fetch of all dealership data
        window.dispatchEvent(new CustomEvent('dealership-changed', { 
          detail: { dealershipId: dealership.id } 
        }))
        
        // Soft refresh to update server components
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DealershipContext.Provider value={{
      currentDealership,
      availableDealerships,
      switchDealership,
      isLoading
    }}>
      {children}
    </DealershipContext.Provider>
  )
}

export const useDealership = () => {
  const context = useContext(DealershipContext)
  if (!context) {
    throw new Error('useDealership must be used within DealershipProvider')
  }
  return context
}
```

### Step 2: Update Root Layout (15 min)

```typescript
// app/(authenticated)/layout.tsx
import { DealershipProvider } from '@/lib/contexts/dealership-context'

export default async function AuthenticatedLayout({ children }) {
  const session = await getServerSession()
  
  // Get user's dealerships
  const dealerships = await prisma.dealerships.findMany({
    where: { 
      users: { some: { id: session.user.id } }
    }
  })
  
  const currentDealership = dealerships.find(d => d.id === session.user.dealershipId) || dealerships[0]
  
  return (
    <DealershipProvider 
      initialDealership={currentDealership}
      availableDealerships={dealerships}
    >
      {children}
    </DealershipProvider>
  )
}
```

### Step 3: Update Dealership Selector (15 min)

```typescript
// components/layout/dealership-selector.tsx
'use client'

import { useDealership } from '@/lib/contexts/dealership-context'

export function DealershipSelector() {
  const { currentDealership, availableDealerships, switchDealership, isLoading } = useDealership()
  const [isOpen, setIsOpen] = useState(false)

  const handleSwitch = async (dealershipId: string) => {
    await switchDealership(dealershipId)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <Building2 />
            <span>{currentDealership?.name || 'Select Dealership'}</span>
          </>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent>
        {availableDealerships.map(dealership => (
          <DropdownMenuItem
            key={dealership.id}
            onClick={() => handleSwitch(dealership.id)}
          >
            {dealership.name}
            {currentDealership?.id === dealership.id && <Check />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 4: Update API Routes Helper (30 min)

```typescript
// lib/api/dealership-helpers.ts
import { NextRequest } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function requireDealership(request: NextRequest) {
  const session = await getServerSession(request)
  
  if (!session?.user?.dealershipId) {
    throw new Error('No dealership selected')
  }
  
  // Verify user has access to this dealership
  const hasAccess = await prisma.dealerships.findFirst({
    where: {
      id: session.user.dealershipId,
      users: { some: { id: session.user.id } }
    }
  })
  
  if (!hasAccess) {
    throw new Error('Access denied to dealership')
  }
  
  return session.user.dealershipId
}

// Use in all API routes
export async function GET(request: NextRequest) {
  const dealershipId = await requireDealership(request)
  
  const data = await prisma.requests.findMany({
    where: { dealershipId } // Always filter by dealership!
  })
  
  return NextResponse.json(data)
}
```

### Step 5: Update Data Fetching Hooks (30 min)

```typescript
// hooks/use-dealership-data.ts
import useSWR from 'swr'
import { useDealership } from '@/lib/contexts/dealership-context'

export function useDealershipData(endpoint: string) {
  const { currentDealership } = useDealership()
  
  // Key includes dealership ID - auto refetches on change!
  const { data, error, mutate } = useSWR(
    currentDealership ? `${endpoint}?dealershipId=${currentDealership.id}` : null,
    fetcher
  )
  
  // Listen for dealership changes
  useEffect(() => {
    const handleChange = () => mutate()
    window.addEventListener('dealership-changed', handleChange)
    return () => window.removeEventListener('dealership-changed', handleChange)
  }, [mutate])
  
  return { data, error, isLoading: !data && !error, mutate }
}

// Use in components
export function DashboardStats() {
  const { data } = useDealershipData('/api/dashboard/stats')
  
  // Component auto-updates when dealership changes!
  return <div>{data?.stats}</div>
}
```

### Step 6: Fix Cache Keys (15 min)

```typescript
// lib/cache/dealership-cache.ts
export function dealershipCacheKey(dealershipId: string, ...parts: string[]) {
  return `d:${dealershipId}:${parts.join(':')}`
}

// In API routes
const cacheKey = dealershipCacheKey(dealershipId, 'analytics', startDate)
const cached = cache.get(cacheKey)
```

## Testing Checklist

1. [ ] Switch dealerships - all data updates without page refresh
2. [ ] Open multiple tabs - switching in one updates others
3. [ ] Check GA4 data - shows correct dealership analytics
4. [ ] Check requests - shows only current dealership's requests
5. [ ] Check dashboard - all widgets show correct data

## Common Issues & Fixes

### Issue: Some data still not updating
**Fix**: Check if the component is using the old pattern. Update to use `useDealershipData` hook.

### Issue: Getting "No dealership selected" errors
**Fix**: Ensure the user has a dealershipId set in the database. Add fallback logic.

### Issue: Performance slow when switching
**Fix**: Add optimistic updates in the context before API call completes.

## Next Steps

1. Audit all API routes to ensure dealership filtering
2. Add dealership ID to all cache keys
3. Remove all `router.refresh()` calls except in context
4. Add loading states during dealership switch

This fix will solve 80% of your dealership isolation issues. The remaining 20% requires auditing each feature.