'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface DebugData {
  debug: {
    userId: string
    email: string
    name: string
    role: string
    agencyId: string | null
    dealershipId: string | null
    agency: {
      id: string
      name: string
      dealerships: Array<{ id: string; name: string }>
    } | null
    currentDealership: {
      id: string
      name: string
    } | null
    sessionData: {
      agencyId: string | null
      dealershipId: string | null
      role: string
    }
  }
  visibility: {
    hasAgencyId: boolean
    hasAvailableDealerships: boolean
    shouldShowSelector: boolean
  }
}

export default function DealershipDebugPage() {
  const { data: session } = useSession()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        const response = await fetch('/api/debug/dealership-debug')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        setDebugData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchDebugData()
    }
  }, [session?.user?.id])

  if (loading) {
    return <div className="p-8">Loading debug data...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>
  }

  if (!debugData) {
    return <div className="p-8">No debug data available</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dealership Selector Debug</h1>
      
      <div className="space-y-6">
        {/* Visibility Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Visibility Status</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${debugData.visibility.hasAgencyId ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Has Agency ID: {debugData.visibility.hasAgencyId ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${debugData.visibility.hasAvailableDealerships ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Has Available Dealerships: {debugData.visibility.hasAvailableDealerships ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${debugData.visibility.shouldShowSelector ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="font-semibold">Should Show Selector: {debugData.visibility.shouldShowSelector ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* User Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">User Data</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">User ID:</span> {debugData.debug.userId}
            </div>
            <div>
              <span className="font-medium">Email:</span> {debugData.debug.email}
            </div>
            <div>
              <span className="font-medium">Name:</span> {debugData.debug.name}
            </div>
            <div>
              <span className="font-medium">Role:</span> {debugData.debug.role}
            </div>
            <div>
              <span className="font-medium">Agency ID:</span> {debugData.debug.agencyId || 'None'}
            </div>
            <div>
              <span className="font-medium">Dealership ID:</span> {debugData.debug.dealershipId || 'None'}
            </div>
          </div>
        </div>

        {/* Agency Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Agency Data</h2>
          {debugData.debug.agency ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Agency ID:</span> {debugData.debug.agency.id}
                </div>
                <div>
                  <span className="font-medium">Agency Name:</span> {debugData.debug.agency.name}
                </div>
              </div>
              
              <div>
                <span className="font-medium">Available Dealerships:</span>
                {debugData.debug.agency.dealerships.length > 0 ? (
                  <ul className="mt-2 ml-4 list-disc">
                    {debugData.debug.agency.dealerships.map(d => (
                      <li key={d.id} className="text-sm">
                        {d.name} (ID: {d.id})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-600 mt-2">No dealerships found</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-red-600">No agency association found</p>
          )}
        </div>

        {/* Current Dealership */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Current Dealership</h2>
          {debugData.debug.currentDealership ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Dealership ID:</span> {debugData.debug.currentDealership.id}
              </div>
              <div>
                <span className="font-medium">Dealership Name:</span> {debugData.debug.currentDealership.name}
              </div>
            </div>
          ) : (
            <p className="text-red-600">No current dealership set</p>
          )}
        </div>

        {/* Session Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Session Data</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Session Agency ID:</span> {debugData.debug.sessionData.agencyId || 'None'}
            </div>
            <div>
              <span className="font-medium">Session Dealership ID:</span> {debugData.debug.sessionData.dealershipId || 'None'}
            </div>
            <div>
              <span className="font-medium">Session Role:</span> {debugData.debug.sessionData.role}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-yellow-800">Recommendations</h2>
          <div className="space-y-2 text-sm text-yellow-700">
            {!debugData.visibility.hasAgencyId && (
              <p>• User needs to be assigned to an agency (agencyId is null)</p>
            )}
            {!debugData.visibility.hasAvailableDealerships && debugData.visibility.hasAgencyId && (
              <p>• Agency needs to have dealerships created</p>
            )}
            {debugData.visibility.shouldShowSelector && (
              <p className="text-green-700">✓ Dealership selector should be visible - check for frontend issues</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}