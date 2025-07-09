// Jest setup file
global.process = {
  ...global.process,
  env: {
    ...global.process.env,
    NODE_ENV: 'test',
    NEXT_PUBLIC_APP_URL: 'https://test.example.com',
    SEOWORKS_WEBHOOK_SECRET: 'test-secret',
  },
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(console.error),
  warn: jest.fn(console.warn),
  // Silence other methods
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};