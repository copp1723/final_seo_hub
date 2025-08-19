import { z } from 'zod'

// SEOWorks webhook payload validation (aligned with GSEO.pdf)
export const seoworksWebhookSchema = z.object({
  eventType: z.enum([
    'task.created',
    'task.updated',
    'task.completed',
    'task.cancelled',
  ]),
  // GSEO.pdf requires an ISO timestamp on root
  timestamp: z.string().datetime(),

  data: z.object({
    // Required core identifiers
    externalId: z.string().min(1),
    // clientId is used for dealership identifier per GSEO.pdf examples
    clientId: z.string().optional(),
    clientEmail: z.string().email().optional(),

    // Task meta per GSEO.pdf
    taskType: z.string().min(1),
    status: z.string().min(1),
    completionDate: z.string().datetime().optional(),
    notes: z.string().optional(),

    // Deliverables array per GSEO.pdf with url optional
    deliverables: z
      .array(
        z.object({
          type: z.string(),
          title: z.string(),
          // url is optional and can be with or without protocol (backward compatibility)
          url: z.string().min(1).optional(),
          publishedDate: z.string().datetime().optional(),
        })
      )
      .optional(),
  }),
})

export type SEOWorksWebhookPayload = z.infer<typeof seoworksWebhookSchema>
