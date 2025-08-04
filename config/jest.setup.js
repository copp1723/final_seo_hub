// Jest setup file for testing environment
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Increase timeout for Redis operations in tests
jest.setTimeout(10000)

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless we're debugging
  log: process.env.DEBUG_TESTS ? console.log : jest.fn(),
  debug: process.env.DEBUG_TESTS ? console.debug : jest.fn(),
  info: process.env.DEBUG_TESTS ? console.info : jest.fn(),
  warn: process.env.DEBUG_TESTS ? console.warn : jest.fn(),
  error: console.error, // Always show errors
}