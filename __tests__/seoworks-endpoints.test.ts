import { NextResponse } from 'next/server'
import * as SendOnboarding from '@/app/api/seoworks/send-onboarding/route'
import * as SendFocusRequest from '@/app/api/seoworks/send-focus-request/route'
import * as Webhook from '@/app/api/seoworks/webhook/route'

// Create a minimal prisma mock shape used by these handlers
jest.mock('@/lib/prisma', () => {
  const users = {
    findUnique: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  }
  const requests = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  }
  const orphaned_tasks = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }
  return { prisma: { users, requests, orphaned_tasks } }
})

// Lightweight logger mock to avoid noisy test output
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getSafeErrorMessage: (e: any) => (e?.message || String(e)),
}))

// Queue/email mocks used indirectly by webhook
jest.mock('@/lib/mailgun/queue', () => ({
  queueEmailWithPreferences: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/mailgun/templates', () => ({
  taskCompletedTemplate: jest.fn(() => ({ subject: 'done', html: 'done', text: 'done' })),
  statusChangedTemplate: jest.fn(() => ({ subject: 'status', html: 'status', text: 'status' })),
  requestCreatedTemplate: jest.fn(() => ({ subject: 'req', html: 'req', text: 'req' })),
  welcomeEmailTemplate: jest.fn(() => ({ subject: 'welcome', html: 'welcome', text: 'welcome' })),
}))
// Use the real minimal sanitizer implementation

// Middleware helpers referenced in webhook
jest.mock('@/lib/api-auth-middleware', () => {
  const actual = jest.requireActual('@/lib/api-auth-middleware')
  return {
    ...actual,
    // For unit tests, bypass rate-limits and API key checks by returning the handler directly
    withRateLimit: () => (handler: any) => handler,
    requireApiKey: () => (handler: any) => handler,
  }
})

// CSRF for focus request endpoint wrapper path (if used)
jest.mock('@/lib/csrf', () => ({
  csrfProtection: jest.fn().mockResolvedValue(null),
}))

// Auth requirements for /api/requests tests if needed by nested calls
jest.mock('@/lib/api-auth', () => ({
  requireAuth: jest.fn(async () => ({ authenticated: true, user: { id: 'user_1', role: 'USER', agencyId: 'agency_1' } })),
  errorResponse: (message: string, status = 400) => NextResponse.json({ error: message }, { status }),
  successResponse: (data: any, status = 200) => NextResponse.json({ data }, { status }),
}))

// Rate limit passthrough
jest.mock('@/lib/rate-limit', () => ({
  rateLimits: { api: jest.fn().mockResolvedValue(null) },
}))

// Validations passthroughs for focus request send
jest.mock('@/lib/validations', () => ({
  // Only used by webhook tests through its own schema; we bypass via middleware mocks
}))

describe('SEOWorks integration endpoints', () => {
  const originalEnv = process.env
  let fetchMock: jest.SpyInstance

  beforeAll(() => {
    process.env = { ...originalEnv }
    process.env.SEOWORKS_API_KEY = 'test-seoworks-api-key'
    process.env.SEOWORKS_WEBHOOK_SECRET = 'test-webhook-secret'
    process.env.SEOWORKS_API_URL = 'https://api.seoworks.example'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, id: 'task-p-12345' }),
      text: async () => JSON.stringify({ success: true }),
    } as any)
  })

  afterAll(() => {
    process.env = originalEnv
    fetchMock.mockRestore()
  })

  test('send-onboarding POST sends payload to SEOWorks and creates user/request', async () => {
    const { prisma } = require('@/lib/prisma')

    prisma.users.findUnique.mockResolvedValue(null)
    prisma.users.create.mockResolvedValue({ id: 'new_user_1', email: 'dealer@example.com' })
    prisma.requests.create.mockResolvedValue({ id: 'req_1' })

    const payload = {
      businessName: 'Acme Ford',
      clientEmail: 'dealer@example.com',
      package: 'GOLD',
      mainBrand: 'Ford',
      otherBrand: '',
      address: '123 Main',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      contactName: 'Jane Smith',
      contactTitle: 'Manager',
      phone: '555-111-2222',
      websiteUrl: 'https://acmeford.com',
      billingEmail: 'billing@acmeford.com',
      siteAccessNotes: 'N/A',
      targetVehicleModels: ['F-150', 'Explorer'],
      targetCities: ['Austin, TX', 'Round Rock, TX'],
      targetDealers: ['Partner A']
    }

    const req = new Request('http://localhost/api/seoworks/send-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }) as any

    const res = await (SendOnboarding as any).POST(req)
    const json = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(json.data?.message).toBe('Dealer onboarding completed successfully')
    expect(fetchMock).toHaveBeenCalled()
    // Ensure SEOWorks header present
    const lastCallArgs = fetchMock.mock.calls.at(-1)[1]
    expect(lastCallArgs.headers['x-api-key']).toBeDefined()
    expect(prisma.users.create).toHaveBeenCalled()
    expect(prisma.requests.create).toHaveBeenCalled()
  })

  test('send-focus-request POST sends built task to SEOWorks and updates request', async () => {
    const { prisma } = require('@/lib/prisma')

    prisma.requests.findUnique.mockResolvedValue({
      id: 'req_123',
      title: 'New Landing Page',
      description: 'Build a city page',
      type: 'page',
      priority: 'HIGH',
      packageType: 'GOLD',
      targetCities: ['Austin, TX'],
      targetModels: ['F-150'],
      keywords: ['ford dealer austin'],
      targetUrl: 'https://acmeford.com/austin',
      users: { id: 'user_1', email: 'dealer@example.com', name: 'Dealer User' },
      agencies: { name: 'Acme Agency' },
    })
    prisma.requests.update.mockResolvedValue({ id: 'req_123', status: 'IN_PROGRESS' })

    process.env.SEOWORKS_API_URL = 'https://api.seoworks.example'
    process.env.SEOWORKS_API_KEY = 'test-seoworks-api-key'

    const req = new Request('http://localhost/api/seoworks/send-focus-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: 'req_123' }),
    }) as any

    const res = await (SendFocusRequest as any).POST(req)
    const json = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(json.data?.message).toBe('Focus request sent to SEOWorks successfully')
    expect(fetchMock).toHaveBeenCalled()
    // Verify request update to IN_PROGRESS was triggered
    expect(prisma.requests.update).toHaveBeenCalled()
  })

  test('webhook GET returns connectivity ok', async () => {
    // GET is wrapped by compose but we mocked requireApiKey and withRateLimit to pass-through
    const req = new Request('http://localhost/api/seoworks/webhook', { method: 'GET' }) as any
    const res = await (Webhook as any).GET(req)
    const json = await (res as Response).json()
    expect(res.status).toBe(200)
    expect(json.status).toBe('ok')
  })

  test('webhook POST processes task.completed and returns success', async () => {
    const { prisma } = require('@/lib/prisma')
    // Existing request found path
    prisma.requests.findFirst.mockResolvedValueOnce({
      id: 'req_abc',
      userId: 'user_1',
      status: 'PENDING',
      pagesCompleted: 0,
      blogsCompleted: 0,
      gbpPostsCompleted: 0,
      improvementsCompleted: 0,
      packageType: null,
      completedTasks: [],
      users: { id: 'user_1', email: 'dealer@example.com' },
    })
    prisma.requests.update.mockResolvedValue({ id: 'req_abc', userId: 'user_1' })

    const payload = {
      eventType: 'task.completed',
      data: {
        externalId: 'req_abc',
        taskType: 'page',
        status: 'completed',
        completionDate: new Date().toISOString(),
        deliverables: [{ type: 'page_post', title: 'Austin Ford Page', url: 'https://acmeford.com/austin' }],
      },
    }

    const req = new Request('http://localhost/api/seoworks/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-webhook-secret' },
      body: JSON.stringify(payload),
    }) as any

    const res = await (Webhook as any).POST(req)
    const json = await (res as Response).json()
    expect(res.status).toBe(200)
    expect(json.message || json.success).toBeDefined()
  })
})


