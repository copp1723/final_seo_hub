import { z } from 'zod'

// SEOWorks webhook payload validation
export const seoworksWebhookSchema = z.object({
  eventType: z.enum([
    'task.created',
    'task.updated', 
    'task.completed',
    'task.cancelled'
  ]),
  
  timestamp: z.string().datetime(),
  
  data: z.object({
    externalId: z.string().min(1),
    taskType: z.string().min(1),
    status: z.string().min(1),
    
    // Client identification fields
    clientId: z.string().optional(),
    clientEmail: z.string().optional(),
    
    // Optional fields
    agencyName: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    completionDate: z.string().datetime().optional(),
    notes: z.string().optional(),
    
    deliverables: z.array(z.object({
      type: z.string(),
      title: z.string(),
      url: z.string().url(),
      publishedDate: z.string().datetime().optional()
    })).optional()
  })
})

export type SEOWorksWebhookPayload = z.infer<typeof seoworksWebhookSchema>
