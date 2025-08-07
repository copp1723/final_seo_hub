import { z } from 'zod'
import { RequestPriority, PackageType } from '@prisma/client'

// Base schema for creating a request
export const createRequestSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .trim(),
  
  type: z
    .enum(['page', 'blog', 'gbp_post', 'maintenance', 'seochange'], {
      errorMap: () => ({ message: 'Invalid request type' })
    }),
  
  priority: z
    .nativeEnum(RequestPriority)
    .optional()
    .default(RequestPriority.MEDIUM),
  
  packageType: z
    .nativeEnum(PackageType)
    .optional(),
  
  targetCities: z
    .array(z.string().trim().min(1))
    .optional()
    .transform(val => val?.filter(city => city.length > 0)),
  
  targetModels: z
    .array(z.string().trim().min(1))
    .optional()
    .transform(val => val?.filter(model => model.length > 0)),
  
  keywords: z
    .array(z.string().trim().min(1))
    .optional()
    .transform(val => val?.filter(keyword => keyword.length > 0)),
  
  targetUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val)
})

// Schema for updating a request
export const updateRequestSchema = createRequestSchema.partial()

// Type exports
export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>
