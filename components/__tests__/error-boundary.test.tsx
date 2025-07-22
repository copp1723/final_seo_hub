import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../error-boundary'; // Adjust path as needed
import { logger } from '@/lib/logger'; // Adjust path as needed

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

// A component that throws an error
const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error from ProblemChild');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console.error output during tests for cleaner test logs
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Reset mocks
    (logger.error as jest.Mock).mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders fallback UI when a child component throws an error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry for the trouble/)).toBeInTheDocument();
    expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
  });

  it('logs the error when a child component throws an error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'React Error Boundary caught an error',
      expect.any(Error), // The actual error object
      expect.objectContaining({
        errorInfo: expect.objectContaining({
          componentStack: expect.any(String),
          errorBoundary: true
        })
      })
    );
  });

  it('renders custom fallback UI if provided', () => {
    const CustomFallback = <h1>Custom Error Fallback</h1>;
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong.')).not.toBeInTheDocument();
  });

  it('attempts to recover when "Try to Render Again" is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );

    // Fallback UI is shown
    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument();

    // Click the "Try to Render Again" button
    fireEvent.click(screen.getByText('Try to Render Again'));

    // Re-render with the child not throwing an error
    rerender(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    // Children content should now be visible
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong.')).not.toBeInTheDocument();
  });

  // Note: Testing window.location.reload() and href navigation is more complex in JSDOM
  // and typically involves mocking window.location or using tools like Cypress for E2E tests.
  // For this unit test, we'll focus on the component's state and direct interactions
});
