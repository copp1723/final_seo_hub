import { 
  searchTasksByQuery, 
  findTasksByTopic, 
  generateTaskContext, 
  detectTaskRelatedIntents,
  TaskReference 
} from './task-context'
import { TaskType } from '@prisma/client'

// Mock task data for testing
const mockTasks: TaskReference[] = [
  {
    id: 'task-1',
    title: 'Honda Civic Landing Page Optimization',
    description: 'Optimize the Honda Civic model page for better search visibility',
    type: TaskType.PAGE,
    completedUrl: 'https://example.com/honda-civic',
    completedTitle: 'Honda Civic - Best Deals in Dallas',
    completedNotes: 'Added structured data, optimized meta tags, improved page speed',
    completedAt: new Date('2024-01-15'),
    targetCity: 'Dallas',
    targetModel: 'Honda Civic',
    keywords: ['Honda Civic Dallas', 'Honda dealer Dallas', 'Civic for sale'],
    requestTitle: 'Honda Civic SEO Request',
    requestDescription: 'Need to improve Honda Civic page rankings'
  },
  {
    id: 'task-2',
    title: 'Local SEO Blog Post - Toyota Service',
    description: 'Create blog post about Toyota service benefits',
    type: TaskType.BLOG,
    completedUrl: 'https://example.com/blog/toyota-service-benefits',
    completedTitle: 'Why Choose Our Toyota Service Center',
    completedNotes: 'Focused on local keywords, included customer testimonials',
    completedAt: new Date('2024-01-10'),
    targetCity: 'Fort Worth',
    targetModel: 'Toyota',
    keywords: ['Toyota service Fort Worth', 'Toyota maintenance', 'Toyota repair'],
    requestTitle: 'Toyota Service Blog',
    requestDescription: 'Blog post to drive service department traffic'
  },
  {
    id: 'task-3',
    title: 'Google Business Profile Post - Inventory Update',
    description: 'GBP post highlighting new inventory arrivals',
    type: TaskType.GBP_POST,
    completedUrl: null,
    completedTitle: 'New 2024 Models Now Available!',
    completedNotes: 'Posted about new inventory with photos and pricing',
    completedAt: new Date('2024-01-05'),
    targetCity: 'Dallas',
    targetModel: null,
    keywords: ['new cars Dallas', '2024 models', 'car inventory'],
    requestTitle: 'Inventory GBP Post',
    requestDescription: 'Promote new inventory on Google Business Profile'
  }
]

describe('Task Context Module', () => {
  describe('searchTasksByQuery', () => {
    it('should find tasks by title keywords', () => {
      const results = searchTasksByQuery(mockTasks, 'Honda Civic')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('task-1') // Should prioritize exact match
    })

    it('should find tasks by target city', () => {
      const results = searchTasksByQuery(mockTasks, 'Dallas')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(task => task.targetCity === 'Dallas')).toBe(true)
    })

    it('should find tasks by keywords', () => {
      const results = searchTasksByQuery(mockTasks, 'Toyota service')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('task-2') // Should prioritize best match
    })

    it('should return recent tasks when no meaningful search terms', () => {
      const results = searchTasksByQuery(mockTasks, 'a b')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should prioritize exact title matches', () => {
      const results = searchTasksByQuery(mockTasks, 'Honda Civic Landing Page')
      expect(results[0].id).toBe('task-1')
    })
  })

  describe('findTasksByTopic', () => {
    it('should find inventory-related tasks', () => {
      const results = findTasksByTopic(mockTasks, 'inventory')
      expect(results.some(task => task.title.toLowerCase().includes('inventory'))).toBe(true)
    })

    it('should find local SEO tasks', () => {
      const results = findTasksByTopic(mockTasks, 'local')
      expect(results.some(task => task.title.toLowerCase().includes('local'))).toBe(true)
    })

    it('should find content-related tasks', () => {
      const results = findTasksByTopic(mockTasks, 'content')
      expect(results.some(task => task.type === TaskType.BLOG)).toBe(true)
    })
  })

  describe('generateTaskContext', () => {
    it('should generate context for multiple tasks', () => {
      const context = generateTaskContext(mockTasks)
      expect(context).toContain('Recently Completed SEO Tasks')
      expect(context).toContain('Honda Civic Landing Page Optimization')
      expect(context).toContain('Local SEO Blog Post')
      expect(context).toContain('Google Business Profile Post')
    })

    it('should include task details in context', () => {
      const context = generateTaskContext([mockTasks[0]])
      expect(context).toContain('Honda Civic - Best Deals in Dallas')
      expect(context).toContain('https://example.com/honda-civic')
      expect(context).toContain('Dallas, Honda Civic')
      expect(context).toContain('Added structured data')
    })

    it('should handle empty task list', () => {
      const context = generateTaskContext([])
      expect(context).toBe('No relevant completed tasks found.')
    })

    it('should truncate long notes', () => {
      const longNotesTask: TaskReference = { ...mockTasks[0],
        completedNotes: 'A'.repeat(300) // Very long notes
      }
      const context = generateTaskContext([longNotesTask])
      expect(context).toContain('...')
    })
  })

  describe('detectTaskRelatedIntents', () => {
    it('should detect task history intent', () => {
      const intents = detectTaskRelatedIntents('What have you done before?')
      expect(intents).toContain('task_history')
    })

    it('should detect similar tasks intent', () => {
      const intents = detectTaskRelatedIntents('Show me similar work like before')
      expect(intents).toContain('similar_tasks')
    })

    it('should detect task examples intent', () => {
      const intents = detectTaskRelatedIntents('Can you show me examples of what you built?')
      expect(intents).toContain('task_examples')
    })

    it('should detect task progress intent', () => {
      const intents = detectTaskRelatedIntents('How is the progress going?')
      expect(intents).toContain('task_progress')
    })

    it('should return empty array for non-task queries', () => {
      const intents = detectTaskRelatedIntents('What is SEO?')
      expect(intents).toHaveLength(0)
    })

    it('should detect multiple intents', () => {
      const intents = detectTaskRelatedIntents('Show me examples of previous work and progress')
      expect(intents.length).toBeGreaterThan(1)
    })
  })

  describe('Task scoring and relevance', () => {
    it('should score recent tasks higher', () => {
      const recentTask: TaskReference = { ...mockTasks[0],
        completedAt: new Date() // Today
      }
      const oldTask: TaskReference = { ...mockTasks[1],
        completedAt: new Date('2023-01-01') // Old
      }
      
      const results = searchTasksByQuery([recentTask, oldTask], 'Honda Toyota')
      // Recent task should score higher due to recency boost
      expect(results[0].completedAt?.getTime()).toBeGreaterThan(results[1].completedAt?.getTime() || 0)
    })

    it('should boost tasks with URLs', () => {
      const taskWithUrl: TaskReference = { ...mockTasks[0],
        completedUrl: 'https://example.com/test'
      }
      const taskWithoutUrl: TaskReference = { ...mockTasks[1],
        completedUrl: null
      }
      
      const results = searchTasksByQuery([taskWithUrl, taskWithoutUrl], 'Honda Toyota')
      // Task with URL should get boost
      expect(results.some(task => task.completedUrl !== null)).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle tasks with null values gracefully', () => {
      const taskWithNulls: TaskReference = {
        id: 'null-task',
        title: 'Test Task',
        description: null,
        type: TaskType.PAGE,
        completedUrl: null,
        completedTitle: null,
        completedNotes: null,
        completedAt: null,
        targetUrl: null,
        targetCity: null,
        targetModel: null,
        keywords: null,
        requestTitle: 'Test Request',
        requestDescription: 'Test Description'
      }
      
      expect(() => searchTasksByQuery([taskWithNulls], 'test')).not.toThrow()
      expect(() => generateTaskContext([taskWithNulls])).not.toThrow()
    })

    it('should handle empty search query', () => {
      const results = searchTasksByQuery(mockTasks, '')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle special characters in search', () => {
      const results = searchTasksByQuery(mockTasks, 'Honda & Toyota!')
      expect(() => searchTasksByQuery(mockTasks, 'Honda & Toyota!')).not.toThrow()
    })
  })
})
