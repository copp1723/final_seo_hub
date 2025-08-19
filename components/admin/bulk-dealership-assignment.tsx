'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Building2, Users, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Dealership {
  id: string
  name: string
  agencyId: string
  agencies: {
    name: string
  }
}

interface BulkDealershipAssignmentProps {
  users: User[]
  dealerships: Dealership[]
  onAssignmentComplete: () => void
}

export default function BulkDealershipAssignment({
  users,
  dealerships,
  onAssignmentComplete
}: BulkDealershipAssignmentProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedDealerships, setSelectedDealerships] = useState<string[]>([])
  const [accessLevel, setAccessLevel] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ')
  const [assigning, setAssigning] = useState(false)

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleDealershipToggle = (dealershipId: string) => {
    setSelectedDealerships(prev => 
      prev.includes(dealershipId)
        ? prev.filter(id => id !== dealershipId)
        : [...prev, dealershipId]
    )
  }

  const handleBulkAssignment = async () => {
    if (selectedUsers.length === 0 || selectedDealerships.length === 0) {
      toast.error('Please select at least one user and one dealership')
      return
    }

    setAssigning(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Process assignments for each user-dealership combination
      for (const userId of selectedUsers) {
        for (const dealershipId of selectedDealerships) {
          try {
            const response = await fetch(`/api/admin/users/${userId}/dealership-access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dealershipId,
                accessLevel
              })
            })

            if (response.ok) {
              successCount++
            } else {
              const errorData = await response.json()
              console.error(`Failed to assign ${userId} to ${dealershipId}:`, errorData.error)
              errorCount++
            }
          } catch (error) {
            console.error(`Error assigning ${userId} to ${dealershipId}:`, error)
            errorCount++
          }
        }
      }

      const totalAssignments = selectedUsers.length * selectedDealerships.length
      
      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} access assignments`)
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} assignments failed (may already exist)`)
      }

      // Reset selections
      setSelectedUsers([])
      setSelectedDealerships([])
      
      // Notify parent component
      onAssignmentComplete()

    } catch (error) {
      console.error('Bulk assignment error:', error)
      toast.error('Failed to process bulk assignments')
    } finally {
      setAssigning(false)
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'READ': return 'bg-blue-100 text-blue-800'
      case 'WRITE': return 'bg-yellow-100 text-yellow-800'
      case 'ADMIN': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="mr-2 h-5 w-5" />
          Bulk Dealership Access Assignment
        </CardTitle>
        <p className="text-sm text-gray-600">
          Grant multiple users access to multiple dealerships at once
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Access Level Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Access Level</label>
          <Select value={accessLevel} onValueChange={(value: 'READ' | 'WRITE' | 'ADMIN') => setAccessLevel(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="READ">👁️ Read Only</SelectItem>
              <SelectItem value="WRITE">✏️ Read & Write</SelectItem>
              <SelectItem value="ADMIN">🔑 Full Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* User Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Select Users ({selectedUsers.length} selected)
              </h3>
              {selectedUsers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => handleUserToggle(user.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{user.name || user.email}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Dealership Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                <Building2 className="mr-2 h-4 w-4" />
                Select Dealerships ({selectedDealerships.length} selected)
              </h3>
              {selectedDealerships.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDealerships([])}
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {dealerships.map((dealership) => (
                <div
                  key={dealership.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <Checkbox
                    checked={selectedDealerships.includes(dealership.id)}
                    onCheckedChange={() => handleDealershipToggle(dealership.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{dealership.name}</div>
                    <div className="text-xs text-gray-500">{dealership.agencies.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assignment Summary */}
        {selectedUsers.length > 0 && selectedDealerships.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  Assignment Summary
                </p>
                <p className="text-sm text-blue-700">
                  {selectedUsers.length} users × {selectedDealerships.length} dealerships = {' '}
                  <strong>{selectedUsers.length * selectedDealerships.length} total assignments</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Access Level: <Badge className={getAccessLevelColor(accessLevel)}>{accessLevel}</Badge>
                </p>
              </div>
              <Button
                onClick={handleBulkAssignment}
                disabled={assigning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Assignments
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Select the access level that users will have to the selected dealerships</li>
            <li>Choose users from the left panel and dealerships from the right panel</li>
            <li>Users will gain access to ALL selected dealerships with the chosen access level</li>
            <li>Existing access assignments will be updated, not duplicated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}