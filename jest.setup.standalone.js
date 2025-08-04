// Standalone Jest setup file
// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    task: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  })),
  TaskType: {
    PAGE: 'PAGE',
    BLOG: 'BLOG',
    GBP_POST: 'GBP_POST',
  },
}))

// Global test timeout
jest.setTimeout(30000)