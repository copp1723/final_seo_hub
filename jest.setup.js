// Optional: configure or set up a testing framework before each test
// If you're using a custom test environment
import '@testing-library/jest-dom'

// Mock next/headers for API route testing
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => ({ get: jest.fn() })),
}))

// Set up global test environment
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
}