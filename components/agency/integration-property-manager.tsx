'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { Loader2, BarChart3, Search, RefreshCw, CheckCircle, AlertCircle, Building2 } from 'lucide-react'

interface GA4Property {
  propertyId: string
  propertyName: string
  accountName: string
  accountId: string
}

interface SearchConsoleSite {
  siteUrl: string
  siteName: string
  permissionLevel: string
  hasFullAccess: boolean
  canUseApi: boolean
}

interface DealershipMapping {
  dealershipId: string
  dealershipName: string
  currentPropertyId?: string
  currentPropertyName?: string
  currentSiteUrl?: string
  currentSiteName?: string
}

export function IntegrationPropertyManager() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([])
  const [searchConsoleSites, setSearchConsoleSites] = useState<SearchConsoleSite[]>([])
  const [dealershipMappings, setDealershipMappings] = useState<DealershipMapping[]>([])
  const [selectedMappings, setSelectedMappings] = useState<Record<string, { ga4?: string; searchConsole?: string }>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch GA4 properties
      const ga4Response = await fetch('/api/ga4/list-properties')
      if (ga4Response.ok) {
        const ga4Data = await ga4Response.json()
        setGa4Properties(ga4Data.properties || [])
        
        // Initialize mappings from GA4 data
        if (ga4Data.dealershipMappings) {
          setDealershipMappings(ga4Data.dealershipMappings)
          const initialMappings: Record<string, { ga4?: string; searchConsole?: string }> = {}
          ga4Data.dealershipMappings.forEach((mapping: DealershipMapping) => {
            initialMappings[mapping.dealershipId] = {
              ga4: mapping.currentPropertyId
            }
          })
          setSelectedMappings(initialMappings)
        }
      }

      // Fetch Search Console sites
      const scResponse = await fetch('/api/search-console/list-sites')
      if (scResponse.ok) {
        const scData = await scResponse.json()
        setSearchConsoleSites(scData.sites || [])
        
        // Update mappings with Search Console data
        if (scData.dealershipMappings) {
          setSelectedMappings(prev => {
            const updated = { ...prev }
            scData.dealershipMappings.forEach((mapping: DealershipMapping) => {
              if (!updated[mapping.dealershipId]) {
                updated[mapping.dealershipId] = {}
              }
              updated[mapping.dealershipId].searchConsole = mapping.currentSiteUrl
            })
            return updated
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast('Failed to load integration data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyChange = (dealershipId: string, type: 'ga4' | 'searchConsole', value: string) => {
    setSelectedMappings(prev => ({
      ...prev,
      [dealershipId]: {
        ...prev[dealershipId],
        [type]: value
      }
    }))
  }

  const saveDealershipMapping = async (dealershipId: string) => {
    setSaving(dealershipId)
    const mapping = selectedMappings[dealershipId] || {}
    
    try {
      // Save GA4 property
      if (mapping.ga4) {
        const property = ga4Properties.find(p => p.propertyId === mapping.ga4)
        const ga4Response = await fetch('/api/ga4/set-property', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: mapping.ga4,
            propertyName: property?.propertyName,
            dealershipId
          })
        })
        
        if (!ga4Response.ok) {
          throw new Error('Failed to update GA4 property')
        }
      }

      // Save Search Console site
      if (mapping.searchConsole) {
        const scResponse = await fetch('/api/search-console/primary-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteUrl: mapping.searchConsole,
            dealershipId
          })
        })
        
        if (!scResponse.ok) {
          throw new Error('Failed to update Search Console site')
        }
      }

      toast('Integration settings saved successfully', 'success')
      
      // Update the current mappings to reflect the saved state
      const dealership = dealershipMappings.find(d => d.dealershipId === dealershipId)
      if (dealership) {
        dealership.currentPropertyId = mapping.ga4
        dealership.currentPropertyName = ga4Properties.find(p => p.propertyId === mapping.ga4)?.propertyName
        dealership.currentSiteUrl = mapping.searchConsole
        dealership.currentSiteName = searchConsoleSites.find(s => s.siteUrl === mapping.searchConsole)?.siteName
      }
    } catch (error) {
      console.error('Failed to save mapping:', error)
      toast('Failed to save integration settings', 'error')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agency Integration Management</CardTitle>
          <CardDescription>
            Manage GA4 and Search Console properties for all dealerships in your agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have access to {ga4Properties.length} GA4 properties and {searchConsoleSites.length} Search Console sites.Assign the correct properties to each dealership below</AlertDescription>
          </Alert>

          <div className="flex justify-end mb-4">
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Properties
            </Button>
          </div>

          <Tabs defaultValue="ga4" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ga4">
                <BarChart3 className="h-4 w-4 mr-2" />
                GA4 Properties
              </TabsTrigger>
              <TabsTrigger value="search-console">
                <Search className="h-4 w-4 mr-2" />
                Search Console
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ga4" className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium">Dealership</th>
                      <th className="p-4 text-left font-medium">Current GA4 Property</th>
                      <th className="p-4 text-left font-medium">Select Property</th>
                      <th className="p-4 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealershipMappings.map((dealership) => (
                      <tr key={dealership.dealershipId} className="border-b">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dealership.dealershipName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {dealership.currentPropertyName ? (
                            <div>
                              <div className="font-medium">{dealership.currentPropertyName}</div>
                              <div className="text-sm text-muted-foreground">ID: {dealership.currentPropertyId}</div>
                            </div>
                          ) : (
                            <Badge variant="secondary">Not Connected</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Select
                            value={selectedMappings[dealership.dealershipId]?.ga4 || undefined}
                            onValueChange={(value) => handlePropertyChange(dealership.dealershipId, 'ga4', value)}
                          >
                            <SelectTrigger className="w-[300px]">
                              <SelectValue placeholder="Select a GA4 property" />
                            </SelectTrigger>
                            <SelectContent>
                              {ga4Properties.map((property) => (
                                <SelectItem key={property.propertyId} value={property.propertyId}>
                                  <div>
                                    <div className="font-medium">{property.propertyName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {property.accountName} • ID: {property.propertyId}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            onClick={() => saveDealershipMapping(dealership.dealershipId)}
                            disabled={saving === dealership.dealershipId ||
                              selectedMappings[dealership.dealershipId]?.ga4 === dealership.currentPropertyId}
                          >
                            {saving === dealership.dealershipId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2">Save</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="search-console" className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-4 text-left font-medium">Dealership</th>
                      <th className="p-4 text-left font-medium">Current Site</th>
                      <th className="p-4 text-left font-medium">Select Site</th>
                      <th className="p-4 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealershipMappings.map((dealership) => (
                      <tr key={dealership.dealershipId} className="border-b">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dealership.dealershipName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {dealership.currentSiteName ? (
                            <div>
                              <div className="font-medium">{dealership.currentSiteName}</div>
                              <div className="text-sm text-muted-foreground">{dealership.currentSiteUrl}</div>
                            </div>
                          ) : (
                            <Badge variant="secondary">Not Connected</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Select
                            value={selectedMappings[dealership.dealershipId]?.searchConsole || undefined}
                            onValueChange={(value) => handlePropertyChange(dealership.dealershipId, 'searchConsole', value)}
                          >
                            <SelectTrigger className="w-[300px]">
                              <SelectValue placeholder="Select a Search Console site" />
                            </SelectTrigger>
                            <SelectContent>
                              {searchConsoleSites.filter(site => site.canUseApi).map((site) => (
                                <SelectItem key={site.siteUrl} value={site.siteUrl}>
                                  <div>
                                    <div className="font-medium">{site.siteName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {site.siteUrl} • {site.hasFullAccess ? 'Full Access' : 'Restricted'}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            onClick={() => saveDealershipMapping(dealership.dealershipId)}
                            disabled={saving === dealership.dealershipId ||
                              selectedMappings[dealership.dealershipId]?.searchConsole === dealership.currentSiteUrl}
                          >
                            {saving === dealership.dealershipId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span className="ml-2">Save</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 
