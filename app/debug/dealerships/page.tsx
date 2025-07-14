'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function DebugDealershipsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dealerships/switch')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [session?.user?.id])

  if (!session) {
    return <div className="p-8">Not authenticated</div>
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug: Dealerships API</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Session Data:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">API Response:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      {data?.availableDealerships && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Available Dealerships:</h2>
          <ul className="list-disc pl-6">
            {data.availableDealerships.map((dealership: any) => (
              <li key={dealership.id}>
                <strong>ID:</strong> {dealership.id} | <strong>Name:</strong> "{dealership.name}"
              </li>
            ))}
          </ul>
        </div>
      )}

      {data?.currentDealership && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Current Dealership:</h2>
          <p><strong>ID:</strong> {data.currentDealership.id}</p>
          <p><strong>Name:</strong> "{data.currentDealership.name}"</p>
        </div>
      )}
    </div>
  )
}