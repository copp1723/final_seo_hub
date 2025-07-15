'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

interface DealershipData {
  name: string
  website?: string
  ga4PropertyId?: string
  searchConsoleUrl?: string
}

export default function BulkCreateDealershipsPage() {
  const { data: session } = useSession()
  const [csvData, setCsvData] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const sampleCsv = `name,website,ga4PropertyId,searchConsoleUrl
Dealership One,https://dealership1.com,123456789,https://dealership1.com
Dealership Two,https://dealership2.com,987654321,https://dealership2.com`

  const parseCsvData = (csv: string): DealershipData[] => {
    const lines = csv.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const dealership: DealershipData = { name: '' }
      
      headers.forEach((header, index) => {
        const value = values[index] || ''
        if (header === 'name') dealership.name = value
        if (header === 'website') dealership.website = value || undefined
        if (header === 'ga4PropertyId') dealership.ga4PropertyId = value || undefined
        if (header === 'searchConsoleUrl') dealership.searchConsoleUrl = value || undefined
      })
      
      return dealership
    }).filter(d => d.name)
  }

  const createDealerships = async () => {
    if (!csvData.trim()) {
      toast('Error', 'error', { description: 'Please enter CSV data' })
      return
    }

    setIsCreating(true)
    setResults([])
    
    try {
      const dealerships = parseCsvData(csvData)
      const newResults: string[] = []
      
      for (const dealership of dealerships) {
        try {
          const response = await fetch('/api/admin/dealerships/bulk-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dealership })
          })
          
          if (response.ok) {
            const result = await response.json()
            newResults.push(`✅ Created: ${dealership.name} (ID: ${result.id})`)
          } else {
            const error = await response.json()
            newResults.push(`❌ Failed: ${dealership.name} - ${error.error}`)
          }
        } catch (error) {
          newResults.push(`❌ Error: ${dealership.name} - ${error}`)
        }
        
        setResults([...newResults])
      }
      
      toast('Success', 'success', { description: `Processed ${dealerships.length} dealerships` })
    } catch (error) {
      toast('Error', 'error', { description: 'Failed to parse CSV data' })
    } finally {
      setIsCreating(false)
    }
  }

  if (session?.user.role !== 'AGENCY_ADMIN' && session?.user.role !== 'SUPER_ADMIN') {
    return <div>Access denied. Agency admin required</div>
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Bulk Create Dealerships</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CSV Data Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Paste your CSV data (name,website,ga4PropertyId,searchConsoleUrl):
              </label>
              <Textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder={sampleCsv}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            
            <Button 
              onClick={createDealerships} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? 'Creating...' : 'Create Dealerships'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
              {results.length === 0 && (
                <div className="text-gray-500">Results will appear here...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sample CSV Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-gray-100 p-4 rounded font-mono">
{sampleCsv}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
