import { NextRequest } from 'next/server';
// Route file is sibling at ../route.ts from __tests__ folder
import { POST } from '../route';
// Use project-relative path to prisma client
import { prisma } from '../../../../../lib/prisma';

jest.mock('../../../../../lib/prisma', () => ({
  prisma: {
    requests: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    orphaned_tasks: {
      create: jest.fn(),
    }
  }
}));

jest.mock('@/lib/api-auth-middleware', () => {
  const mod = jest.requireActual('@/lib/api-auth-middleware');
  return {
    ...mod,
    // bypass middleware in unit test by exporting POST directly
  };
});

describe('SEOWorks Webhook - PDF alignment', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...origEnv, SEOWORKS_WEBHOOK_SECRET: 'test-secret' } as any;
  });

  afterAll(() => {
    process.env = origEnv;
  });

  function makeRequest(body: any, headers: Record<string, string> = {}) {
    const req = new Request('http://localhost/api/seoworks/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test-secret',
        ...headers,
      },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
    return req;
  }

  it('returns PDF success shape when dealership exists', async () => {
    (prisma.requests.findFirst as jest.Mock).mockResolvedValue({
      id: 'req_123',
      users: { id: 'user_1', email: 'u@example.com' }
    });

    const payload = {
      eventType: 'task.completed',
      timestamp: '2025-01-28T20:00:00Z',
      data: {
        externalId: 'seo-task-12345',
        clientId: 'dealer-acura-columbus',
        taskType: 'blog',
        status: 'completed',
        completionDate: '2025-01-28T20:00:00Z',
        deliverables: [
          { type: 'blog', title: 'Title', url: 'https://example.com' }
        ]
      }
    };

    const res = await POST(makeRequest(payload));
    const json = await (res as Response).json();

    expect((res as Response).ok).toBe(true);
    // PDF-aligned response
    expect(json).toMatchObject({
      success: true,
      message: 'Webhook processed successfully',
      requestId: 'req_123',
    });
  });

  it('returns PDF stored_for_later_processing shape when no dealership found', async () => {
    (prisma.requests.findFirst as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    (prisma.orphaned_tasks.create as jest.Mock).mockResolvedValue({ id: 'orph_1' });

    const payload = {
      eventType: 'task.completed',
      timestamp: '2025-01-28T20:00:00Z',
      data: {
        externalId: 'blog-acura-001',
        clientId: 'dealer-unknown',
        taskType: 'blog',
        status: 'completed',
        completionDate: '2025-01-28T20:00:00Z',
        deliverables: [
          { type: 'blog', title: 'Title', url: 'https://example.com' }
        ]
      }
    };

    const res = await POST(makeRequest(payload));
    const json = await (res as Response).json();

    expect((res as Response).ok).toBe(true);
    // PDF-aligned orphan response
    expect(json).toMatchObject({
      message: 'Webhook received and task stored (dealership not yet set up)',
      status: 'stored_for_later_processing',
      seoworksTaskId: 'blog-acura-001',
    });
  });
});