# Dealership Data Isolation Fix Strategy

## Current Problems
1. Dealership context is stored in user.dealershipId but not propagated through the app
2. APIs don't consistently filter by dealership context
3. Cache keys don't include dealership ID
4. Components fetch data without dealership context

## Solution: Central Dealership Context

### 1. Create a DealershipContext Provider

```typescript
// lib/dealership-context.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DealershipContextType {
  currentDealership: { id: string; name: string } | null
  switchDealership: (dealershipId: string) => Promise<void>
  isLoading: boolean
}

const DealershipContext = createContext<DealershipContextType | null>(null)

export function DealershipProvider({ children, initialDealership }) {
  const [currentDealership, setCurrentDealership] = useState(initialDealership)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const switchDealership = async (dealershipId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/dealerships/switch', {
        method: 'POST',
        body: JSON.stringify({ dealershipId })
      })
      
      if (res.ok) {
        const data = await res.json()
        setCurrentDealership(data.dealership)
        
        // Invalidate all dealership-specific caches
        await fetch('/api/cache/invalidate', {
          method: 'POST',
          body: JSON.stringify({ dealershipId })
        })
        
        // No page refresh! Just update context
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Broadcast dealership changes to all tabs
  useEffect(() => {
    const channel = new BroadcastChannel('dealership-switch')
    channel.onmessage = (e) => {
      if (e.data.dealershipId !== currentDealership?.id) {
        setCurrentDealership(e.data.dealership)
        router.refresh()
      }
    }
    return () => channel.close()
  }, [currentDealership])

  return (
    <DealershipContext.Provider value={{ currentDealership, switchDealership, isLoading }}>
      {children}
    </DealershipContext.Provider>
  )
}

export const useDealership = () => {
  const context = useContext(DealershipContext)
  if (!context) throw new Error('useDealership must be used within DealershipProvider')
  return context
}
```

### 2. Update All API Routes

Create a standard pattern for all API routes:

```typescript
// lib/api-helpers.ts
export async function getDealershipContext(request: NextRequest) {
  const session = await getSession(request)
  if (!session?.user?.dealershipId) {
    throw new Error('No dealership selected')
  }
  return session.user.dealershipId
}

// Example API route update
export async function GET(request: NextRequest) {
  const dealershipId = await getDealershipContext(request)
  
  // All queries now filter by dealership
  const data = await prisma.requests.findMany({
    where: { dealershipId },
    // ...
  })
  
  return NextResponse.json(data)
}
```

### 3. Fix Cache Keys

```typescript
// lib/cache-utils.ts
export function getDealershipCacheKey(dealershipId: string, ...parts: string[]) {
  return `dealership:${dealershipId}:${parts.join(':')}`
}

// Usage in API routes
const cacheKey = getDealershipCacheKey(dealershipId, 'analytics', startDate, endDate)
```

### 4. Update Components to Use Context

```typescript
// components/dashboard/stats.tsx
export function DashboardStats() {
  const { currentDealership } = useDealership()
  
  const { data } = useSWR(
    currentDealership ? `/api/dashboard/stats?dealershipId=${currentDealership.id}` : null
  )
  
  // Component automatically updates when dealership changes
}
```

### 5. Migration Steps

1. Add DealershipProvider to root layout
2. Update all API routes to use getDealershipContext
3. Update all cache keys to include dealership ID
4. Replace direct dealership switching with context method
5. Update all data-fetching components to use dealership context

### Expected Results

- Switching dealerships instantly updates all components
- No page refresh needed
- Data is properly isolated per dealership
- Cache invalidation works correctly
- Multi-tab sync for dealership changes