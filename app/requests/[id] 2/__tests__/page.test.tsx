import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestDetailPage from '../../[id]/page'; // Adjust path to correct location

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockCompletedTask = {
  id: 'task-1',
  title: 'Finished sub-task 1',
  url: 'http://example.com/task1',
  notes: 'Some notes for task 1',
  completedAt: new Date('2023-10-01T10:00:00Z').toISOString(),
};

const mockRequestDetails = {
  id: 'detail-req-1',
  title: 'Detailed Request View',
  description: 'Full description here.',
  status: 'IN_PROGRESS',
  completedTasks: [mockCompletedTask],
  totalTasks: 3,
  completedTaskCount: 1,
  createdAt: new Date('2023-09-15T08:00:00Z').toISOString(),
  updatedAt: new Date('2023-09-28T14:30:00Z').toISOString(),
  completionDate: undefined,
};

const mockRequestDetailsDone = {
    ...mockRequestDetails,
    status: 'DONE',
    completionDate: new Date('2023-10-05T12:00:00Z').toISOString(),
    completedTaskCount: 3,
};


describe('RequestDetailPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (require('next/navigation').useParams as jest.Mock).mockReturnValue({ id: 'detail-req-1' });
  });

  it('shows loading state initially', () => {
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {})); // Never resolves
    render(<RequestDetailPage />);
    expect(screen.getByText('Loading request details...')).toBeInTheDocument();
  });

  it('fetches and displays request details correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequestDetails,
    });

    render(<RequestDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(mockRequestDetails.title)).toBeInTheDocument();
    });
    expect(screen.getByText(`Request ID: ${mockRequestDetails.id}`)).toBeInTheDocument();
    expect(screen.getByText(`Status: ${mockRequestDetails.status}`)).toBeInTheDocument();
    expect(screen.getByText(`Description: ${mockRequestDetails.description}`)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 tasks completed/)).toBeInTheDocument();

    // Check for completed task display
    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByText(mockCompletedTask.title)).toBeInTheDocument();
    expect(screen.getByText(mockCompletedTask.notes!)).toBeInTheDocument(); // Use non-null assertion if sure
    const taskUrlElement = screen.getByRole('link', { name: mockCompletedTask.url });
    expect(taskUrlElement).toBeInTheDocument();
    expect(taskUrlElement).toHaveAttribute('href', mockCompletedTask.url);
    expect(screen.getByText(`Completed: ${new Date(mockCompletedTask.completedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })}`)).toBeInTheDocument();
  });

  it('displays completion date for DONE requests', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRequestDetailsDone,
    });

    render(<RequestDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(`Status: DONE`)).toBeInTheDocument();
    });
    expect(screen.getByText(`Completed On: ${new Date(mockRequestDetailsDone.completionDate!).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })}`)).toBeInTheDocument();
  });

  it('displays "No tasks have been marked as complete" if completedTasks is empty', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockRequestDetails, completedTasks: [] }),
    });

    render(<RequestDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('No tasks have been marked as complete for this request yet.')).toBeInTheDocument();
    });
  });

  it('displays error message if fetching fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Request not found' }),
      statusText: 'Not Found',
    });

    render(<RequestDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Error: Request not found')).toBeInTheDocument();
    });
  });

  it('displays error message if ID is not found in URL (e.g. params is null)', async () => {
    (require('next/navigation').useParams as jest.Mock).mockReturnValue(null);
    render(<RequestDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Error: Request ID not found in URL.')).toBeInTheDocument();
    });
  });
});
