'use client'

import { useState, useEffect } from 'react'
import { useDealership } from '@/app/context/DealershipContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function DealershipDebug() {
  const { currentDealership, availableDealerships, switchDealership, isLoading, isSwitching } = useDealership()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [testResults, setTestResults] = useState<any>({})

  useEffect(() => {
    // Update debug info whenever dealership changes
    const updateDebugInfo = () => {
      const localStorageValue = typeof window !== 'undefined' ? localStorage.getItem('selectedDealershipId') : null
      
      setDebugInfo({
        currentDealership: currentDealership,
        localStorageValue,
        availableDealershipsCount: availableDealerships.length,
        timestamp: new Date().toISOString()
      })
    }

    updateDebugInfo()

    // Listen for dealership changes
    const handleDealershipChange = (event: CustomEvent) => {
      console.log('🔄 Dealership changed event received:', event.detail)
      updateDebugInfo()
    }

    window.addEventListener('dealershipChanged', handleDealershipChange as EventListener)
    
    return () => {
      window.removeEventListener('dealershipChanged', handleDealershipChange as EventListener)
    }
  }, [currentDealership, availableDealerships])

  const testAPICall = async (endpoint: string, dealershipId?: string) => {
    try {
      const url = dealershipId 
        ? `${endpoint}?dealershipId=${dealershipId}&clearCache=true`
        : endpoint
      
      console.log(`🧪 Testing API call: ${url}`)
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        return { success: true, data, status: response.status }
      } else {
        const errorText = await response.text()
        return { success: false, error: errorText, status: response.status }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const runTests = async () => {
    console.log('🧪 Running dealership filtering tests...')
    
    const results: any = {}
    
    // Test 1: Get dealerships
    results.dealerships = await testAPICall('/api/dealerships/switch')
    
    // Test 2: Dashboard analytics with current dealership
    if (currentDealership?.id) {
      results.analyticsWithDealership = await testAPICall('/api/dashboard/analytics?dateRange=30days', currentDealership.id)
    }
    
    // Test 3: Dashboard analytics without dealership filter
    results.analyticsWithoutDealership = await testAPICall('/api/dashboard/analytics?dateRange=30days')
    
    // Test 4: Tasks with current dealership
    if (currentDealership?.id) {
      results.tasksWithDealership = await testAPICall('/api/tasks', currentDealership.id)
    }
    
    // Test 5: Tasks without dealership filter
    results.tasksWithoutDealership = await testAPICall('/api/tasks')
    
    setTestResults(results)
    console.log('🧪 Test results:', results)
  }

  const handleSwitchTest = async () => {
    if (availableDealerships.length < 2) return
    
    // Find a different dealership to switch to
    const targetDealership = availableDealerships.find(d => d.id !== currentDealership?.id)
    if (!targetDealership) return
    
    console.log(`🔄 Testing switch to: ${targetDealership.name}`)
    
    const success = await switchDealership(targetDealership.id)
    console.log(`🔄 Switch result: ${success}`)
    
    if (success) {
      // Wait a moment then test API calls
      setTimeout(() => {
        runTests()
      }, 1000)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🐛 Dealership Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Current Dealership:</strong>
              <div className="mt-1 p-2 bg-gray-50 rounded">
                {currentDealership ? (
                  <>
                    <div>Name: {currentDealership.name}</div>
                    <div>ID: {currentDealership.id}</div>
                  </>
                ) : (
                  <div className="text-gray-500">None selected</div>
                )}
              </div>
            </div>
            
            <div>
              <strong>localStorage Value:</strong>
              <div className="mt-1 p-2 bg-gray-50 rounded">
                {debugInfo.localStorageValue || <span className="text-gray-500">None</span>}
              </div>
            </div>
            
            <div>
              <strong>Available Dealerships:</strong>
              <div className="mt-1 p-2 bg-gray-50 rounded">
                {debugInfo.availableDealershipsCount || 0} dealerships
              </div>
            </div>
            
            <div>
              <strong>Status:</strong>
              <div className="mt-1 p-2 bg-gray-50 rounded">
                {isLoading && <span className="text-blue-600">Loading...</span>}
                {isSwitching && <span className="text-orange-600">Switching...</span>}
                {!isLoading && !isSwitching && <span className="text-green-600">Ready</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isLoading || isSwitching}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Test API Calls
            </Button>
            
            <Button 
              onClick={handleSwitchTest} 
              disabled={isLoading || isSwitching || availableDealerships.length < 2}
              variant="outline"
            >
              Test Switch
            </Button>
          </div>
          
          {Object.keys(testResults).length > 0 && (
            <div>
              <strong>Test Results:</strong>
              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
