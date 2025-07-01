import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'

// Since the route file has a placeholder db, we'll test the behavior by observing console.log
// and testing the actual responses. The route is designed to be a placeholder implementation.
const originalConsoleLog = console.log

beforeEach(() => {
  jest.clearAllMocks()
  console.log = jest.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
})

// Helper function to create mock NextRequest
const createMockRequest = (method: string, body?: any): NextRequest => {
  const url = 'http://localhost:3000/api/requests/test-id'
  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request
}

// Helper function to create mock params
const createMockParams = (id: string) => ({ params: { id } })

describe('/api/requests/[id] API Route', () => {
  describe('GET /api/requests/[id]', () => {
    it('should return 400 if request ID is missing', async () => {
      const request = createMockRequest('GET')
      const params = createMockParams('')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Request ID is required')
    })

    it('should return 404 if request is not found', async () => {
      const request = createMockRequest('GET')
      const params = createMockParams('non-existent-id')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Request not found')
    })

    it('should return 200 with request data if request exists', async () => {
      const request = createMockRequest('GET')
      const params = createMockParams('existing-request-id')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('existing-request-id')
      expect(data.status).toBe('OPEN')
    })
  })

  describe('PUT /api/requests/[id]', () => {
    describe('Request ID Validation', () => {
      it('should return 400 if request ID is missing', async () => {
        const request = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Request ID is required')
      })

      it('should return 404 if request is not found', async () => {
        const request = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('non-existent-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Request not found')
      })
    })

    describe('Status Updates', () => {
      it('should update status successfully with valid status', async () => {
        const request = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Request status updated to IN_PROGRESS.')
        expect(data.request.status).toBe('IN_PROGRESS')
      })

      it('should return 400 for invalid status value', async () => {
        const request = createMockRequest('PUT', { status: 'INVALID_STATUS' })
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid status value')
      })

      it('should set completionDate when status is changed to DONE', async () => {
        const request = createMockRequest('PUT', { status: 'DONE' })
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.request.completionDate).toBeDefined()
        expect(data.request.status).toBe('DONE')
      })

      it('should accept all valid status values', async () => {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'ARCHIVED']
        
        for (const status of validStatuses) {
          const request = createMockRequest('PUT', { status })
          const params = createMockParams('existing-request-id')

          const response = await PUT(request, params)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.message).toBe(`Request status updated to ${status}.`)
        }
      })
    })

    describe('Task Completion', () => {
      it('should complete task successfully when request is IN_PROGRESS', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)

        // Now test task completion
        const taskDetails = {
          title: 'Complete SEO Analysis',
          url: 'https://example.com',
          notes: 'Completed comprehensive SEO audit'
        }
        
        const taskRequest = createMockRequest('PUT', { taskDetails })
        const response = await PUT(taskRequest, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toContain('Task marked as complete.')
        expect(data.request.completedTasks).toHaveLength(1)
        expect(data.request.completedTasks[0].title).toBe('Complete SEO Analysis')
        expect(data.request.completedTasks[0].url).toBe('https://example.com')
        expect(data.request.completedTasks[0].notes).toBe('Completed comprehensive SEO audit')
        expect(data.request.completedTasks[0].completedAt).toBeDefined()
        expect(data.request.completedTaskCount).toBe(1)
      })

      it('should return 400 if task title is missing', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)

        // Now test task completion with missing title
        const taskDetails = {
          url: 'https://example.com',
          notes: 'Some notes'
        }
        
        const request = createMockRequest('PUT', { taskDetails })
        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Task title is required for completion')
      })

      it('should return 400 if trying to complete task when request is not IN_PROGRESS', async () => {
        const taskDetails = {
          title: 'Complete Task'
        }
        
        const request = createMockRequest('PUT', { taskDetails })
        // This uses the default mock which returns status 'OPEN'
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Tasks can only be completed if the request is IN_PROGRESS')
      })

      it('should handle task completion with minimal data (title only)', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)

        // Now test task completion with minimal data
        const taskDetails = {
          title: 'Basic Task'
        }
        
        const request = createMockRequest('PUT', { taskDetails })
        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.request.completedTasks[0].title).toBe('Basic Task')
        expect(data.request.completedTasks[0].url).toBeUndefined()
        expect(data.request.completedTasks[0].notes).toBeUndefined()
      })
    })

    describe('Combined Updates', () => {
      it('should handle simultaneous status update and task completion', async () => {
        const body = {
          status: 'IN_PROGRESS',
          taskDetails: {
            title: 'Combined Update Task',
            url: 'https://example.com'
          }
        }
        
        const request = createMockRequest('PUT', body)
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Request status updated to IN_PROGRESS. Task marked as complete.')
        expect(data.request.status).toBe('IN_PROGRESS')
        expect(data.request.completedTasks).toHaveLength(1)
        expect(data.request.completedTasks[0].title).toBe('Combined Update Task')
      })
    })

    describe('Edge Cases and Error Handling', () => {
      it('should return 400 for invalid JSON payload', async () => {
        // Create a request with invalid JSON
        const url = 'http://localhost:3000/api/requests/existing-request-id'
        const request = new NextRequest(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: '{"invalid": json}', // Invalid JSON
        })
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid JSON payload')
      })

      it('should return 200 with message when no update data is provided', async () => {
        const request = createMockRequest('PUT', {})
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('No update performed. Provide status or taskDetails.')
      })

      it('should handle requests with undefined or null values gracefully', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)

        // Now test task completion with null/undefined values
        const body = {
          taskDetails: {
            title: 'Test Task',
            url: null,
            notes: undefined
          }
        }
        
        const request = createMockRequest('PUT', body)
        const response = await PUT(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.request.completedTasks[0].url).toBeNull()
        expect(data.request.completedTasks[0].notes).toBeUndefined()
      })

      it('should handle server errors gracefully', async () => {
        // Mock an error by making the request body cause a JSON parsing error
        const url = 'http://localhost:3000/api/requests/existing-request-id'
        const request = new NextRequest(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: undefined, // This should cause issues
        })
        const params = createMockParams('existing-request-id')

        const response = await PUT(request, params)
        const data = await response.json()

        // The function should handle this gracefully
        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to update request')
      })
    })

    describe('Database Interaction Verification', () => {
      it('should log appropriate database operations', async () => {
        const request = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')

        await PUT(request, params)

        // Verify that database operations were logged (since we're using a mock db)
        expect(console.log).toHaveBeenCalledWith('DB: Finding request with id: existing-request-id')
        expect(console.log).toHaveBeenCalledWith('DB: Updating request with id: existing-request-id with data:', expect.any(Object))
      })

      it('should call database methods with correct parameters for status update', async () => {
        const request = createMockRequest('PUT', { status: 'DONE' })
        const params = createMockParams('existing-request-id')

        await PUT(request, params)

        // Verify the database interactions through console logs
        expect(console.log).toHaveBeenCalledWith('DB: Finding request with id: existing-request-id')
        expect(console.log).toHaveBeenCalledWith(
          'DB: Updating request with id: existing-request-id with data:',
          expect.objectContaining({
            status: 'DONE',
            completionDate: expect.any(String)
          })
        )
      })

      it('should call database methods with correct parameters for task completion', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)
        
        // Clear previous console.log calls
        ;(console.log as jest.Mock).mockClear()

        // Now test task completion
        const taskDetails = {
          title: 'Database Test Task',
          url: 'https://test.example.com'
        }
        const request = createMockRequest('PUT', { taskDetails })
        await PUT(request, params)

        expect(console.log).toHaveBeenCalledWith(
          'DB: Updating request with id: existing-request-id with data:',
          expect.objectContaining({
            completedTasks: expect.arrayContaining([
              expect.objectContaining({
                title: 'Database Test Task',
                url: 'https://test.example.com'
              })
            ]),
            completedTaskCount: 1
          })
        )
      })
    })

    describe('Task ID Generation', () => {
      it('should generate unique task IDs for completed tasks', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)

        // Now test task completion with unique IDs
        const taskDetails1 = { title: 'Task 1' }
        const taskDetails2 = { title: 'Task 2' }
        
        const request1 = createMockRequest('PUT', { taskDetails: taskDetails1 })
        const request2 = createMockRequest('PUT', { taskDetails: taskDetails2 })

        const response1 = await PUT(request1, params)
        const data1 = await response1.json()
        
        const response2 = await PUT(request2, params)
        const data2 = await response2.json()

        expect(data1.request.completedTasks[0].id).toBeDefined()
        expect(data2.request.completedTasks[0].id).toBeDefined()
        expect(data1.request.completedTasks[0].id).not.toBe(data2.request.completedTasks[0].id)
      })
    })

    describe('CompletedAt Timestamp', () => {
      it('should set completedAt timestamp in ISO format', async () => {
        // First update the request to IN_PROGRESS status
        const statusRequest = createMockRequest('PUT', { status: 'IN_PROGRESS' })
        const params = createMockParams('existing-request-id')
        await PUT(statusRequest, params)

        // Now test task completion with timestamp
        const taskDetails = { title: 'Timestamp Test Task' }
        const request = createMockRequest('PUT', { taskDetails })

        const beforeTime = new Date().toISOString()
        const response = await PUT(request, params)
        const afterTime = new Date().toISOString()
        const data = await response.json()

        expect(data.request.completedTasks[0].completedAt).toBeDefined()
        expect(data.request.completedTasks[0].completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        
        // Verify timestamp is within reasonable range
        const completedAt = data.request.completedTasks[0].completedAt
        expect(completedAt >= beforeTime).toBe(true)
        expect(completedAt <= afterTime).toBe(true)
      })
    })
  })
})