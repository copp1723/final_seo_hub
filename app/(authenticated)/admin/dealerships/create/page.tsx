'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/simple-auth-provider'
import { useRouter } from 'next/navigation'
import AgencyDealershipOnboarding from '@/components/admin/agency-dealership-onboarding'

interface Agency {
  id: string
  name: string
}

export default function CreateDealershipPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null)

  useEffect(() => {
    if (!user) return

    // Check user permissions
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'AGENCY_ADMIN') {
      router.push('/admin')
      return
    }

    fetchAgencies()
  }, [user, router])

  // Preselect agency from query params if provided
  useEffect(() => {
    if (!user) return
    try {
      const params = new URLSearchParams(window.location.search)
      const agencyId = params.get('agencyId')
      const agencyName = params.get('agencyName')
      if (agencyId) {
        setCurrentAgency({ id: agencyId, name: agencyName || 'Selected Agency' })
      }
    } catch (_) {
      // no-op
    }
  }, [user])

  const fetchAgencies = async () => {
    try {
      if (user?.role === 'AGENCY_ADMIN' && user.agencyId) {
        // For AGENCY_ADMIN, we need to get their agency details
        const response = await fetch(`/api/admin/agencies/${user.agencyId}`)
        if (response.ok) {
          const agencyData = await response.json()
          const agency = { id: user.agencyId, name: agencyData.agency?.name || 'Your Agency' }
          setAgencies([agency])
          setCurrentAgency(agency)
        } else {
          // Fallback for agency admin
          const agency = { id: user.agencyId, name: 'Your Agency' }
          setAgencies([agency])
          setCurrentAgency(agency)
        }
      } else if (user?.role === 'SUPER_ADMIN') {
        // For SUPER_ADMIN, fetch all agencies
        const response = await fetch('/api/admin/agencies')
        if (!response.ok) throw new Error('Failed to fetch agencies')
        
        const data = await response.json()
        const fetchedAgencies = data.agencies || []
        setAgencies(fetchedAgencies)
        
        // If there's only one agency, select it by default
        if (fetchedAgencies.length === 1) {
          setCurrentAgency(fetchedAgencies[0])
        }
      }
    } catch (error) {
      console.error('Error fetching agencies:', error)
      // For AGENCY_ADMIN, provide fallback
      if (user?.role === 'AGENCY_ADMIN' && user.agencyId) {
        const agency = { id: user.agencyId, name: 'Your Agency' }
        setAgencies([agency])
        setCurrentAgency(agency)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // For SUPER_ADMIN with multiple agencies, show agency selection
  if (user?.role === 'SUPER_ADMIN' && agencies.length > 1 && !currentAgency) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Select Agency</h2>
          <p className="text-gray-600 mb-6">
            Choose which agency you want to create a dealership for:
          </p>
          <div className="space-y-2">
            {agencies.map((agency) => (
              <button
                key={agency.id}
                onClick={() => setCurrentAgency(agency)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium">{agency.name}</div>
                <div className="text-sm text-gray-500">ID: {agency.id}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show the onboarding form
  if (currentAgency) {
    return (
      <AgencyDealershipOnboarding 
        agencyId={currentAgency.id}
        agencyName={currentAgency.name}
      />
    )
  }

  // Fallback if no agency found
  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">No Agency Access</h2>
        <p className="text-red-600 mb-4">
          Unable to determine which agency you have access to. Please contact support.
        </p>
        <button 
          onClick={() => router.push('/admin')}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Return to Admin
        </button>
      </div>
    </div>
  )
}