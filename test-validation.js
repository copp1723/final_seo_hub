// Test the webhook validation schema
const { z } = require('zod');

// Copy of the updated schema
const seoworksWebhookSchema = z.object({
  eventType: z.enum([
    'task.created',
    'task.updated',
    'task.completed',
    'task.cancelled',
  ]),
  timestamp: z.string().datetime(),

  data: z.object({
    externalId: z.string().min(1),
    clientId: z.string().optional(),
    clientEmail: z.string().email().optional(),
    taskType: z.string().min(1),
    status: z.string().min(1),
    completionDate: z.string().datetime().optional(),
    notes: z.string().optional(),
    deliverables: z
      .array(
        z.object({
          type: z.string(),
          title: z.string(),
          // Updated validation - should accept URLs without protocol
          url: z.string().min(1).optional(),
          publishedDate: z.string().datetime().optional(),
        })
      )
      .optional(),
  }),
});

// SEOWorks original payload
const payload = {
  "eventType": "task.completed",
  "data": {
    "status": "completed",
    "deliverables": [{
      "title": "2025 Polaris Ranger Crew 1000 Premium near Olathe, KS",
      "type": "page",
      "url": "www.jayhatfieldottawa.com/2025-polaris-ranger-crew-1000-premium-near-olathe-ks"
    }],
    "clientId": "dealer-jhm-ottawa",
    "taskType": "page",
    "completionDate": "2025-08-12T06:00:00Z",
    "externalId": "test-original-format-123"
  },
  "timestamp": "2025-08-15T19:42:49Z"
};

console.log('🧪 Testing webhook validation with SEOWorks original format...\n');

const result = seoworksWebhookSchema.safeParse(payload);

if (result.success) {
  console.log('✅ VALIDATION SUCCESS!');
  console.log('The payload should now be accepted by the webhook.');
  console.log('');
  console.log('Normalized URL would be:', 
    payload.data.deliverables[0].url.startsWith('http') 
      ? payload.data.deliverables[0].url 
      : `https://${payload.data.deliverables[0].url}`
  );
} else {
  console.log('❌ VALIDATION FAILED:');
  console.log('Errors:', JSON.stringify(result.error.errors, null, 2));
  
  // Check specific field errors
  result.error.errors.forEach(error => {
    console.log(`\nField: ${error.path.join('.')}`);
    console.log(`Message: ${error.message}`);
    console.log(`Code: ${error.code}`);
  });
}