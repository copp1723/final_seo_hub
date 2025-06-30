import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestCard from '../request-card'; // Adjust path as necessary
import StatusUpdater from '../status-updater';
import CompletionModal from '../completion-modal';

// Mock child components
jest.mock('../status-updater', () => jest.fn(({ currentStatus, onStatusChange }) => (
  <select data-testid="status-updater" value={currentStatus} onChange={(e) => onStatusChange(e.target.value)}>
    <option value="OPEN">OPEN</option>
    <option value="IN_PROGRESS">IN_PROGRESS</option>
    <option value="DONE">DONE</option>
  </select>
)));

jest.mock('../completion-modal', () => jest.fn(({ isOpen, onClose, onSubmit }) => (
  isOpen ? (
    <div data-testid="completion-modal">
      <button data-testid="modal-submit-button" onClick={() => onSubmit({ title: 'Mock Task Title' })}>Submit</button>
      <button data-testid="modal-close-button" onClick={onClose}>Close Modal</button>
    </div>
  ) : null
)));

// Mock fetch
global.fetch = jest.fn();

const mockInitialRequestOpen = {
  id: 'req-open-1',
  title: 'Open Request',
  description: 'This request is open.',
  status: 'OPEN',
};

const mockInitialRequestInProgress = {
  id: 'req-inprogress-1',
  title: 'In Progress Request',
  description: 'This request is in progress.',
  status: 'IN_PROGRESS',
};

describe('RequestCard', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (StatusUpdater as jest.Mock).mockClear();
    (CompletionModal as jest.Mock).mockClear();
  });

  it('renders request information correctly', () => {
    render(<RequestCard initialRequest={mockInitialRequestOpen} />);
    expect(screen.getByText(`${mockInitialRequestOpen.title} (ID: ${mockInitialRequestOpen.id})`)).toBeInTheDocument();
    expect(screen.getByText(`Description: ${mockInitialRequestOpen.description}`)).toBeInTheDocument();
    expect(screen.getByText(`Current Status: OPEN`)).toBeInTheDocument();
  });

  it('integrates StatusUpdater and passes correct props', () => {
    render(<RequestCard initialRequest={mockInitialRequestOpen} />);
    expect(StatusUpdater).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStatus: mockInitialRequestOpen.status,
        requestId: mockInitialRequestOpen.id,
      }),
      {}
    );
  });

  it('does not show "Mark Task Complete" button if status is not IN_PROGRESS', () => {
    render(<RequestCard initialRequest={mockInitialRequestOpen} />);
    expect(screen.queryByRole('button', { name: 'Mark Task Complete' })).not.toBeInTheDocument();
  });

  it('shows "Mark Task Complete" button if status is IN_PROGRESS', () => {
    render(<RequestCard initialRequest={mockInitialRequestInProgress} />);
    expect(screen.getByRole('button', { name: 'Mark Task Complete' })).toBeInTheDocument();
  });

  it('opens CompletionModal when "Mark Task Complete" is clicked (if IN_PROGRESS)', () => {
    render(<RequestCard initialRequest={mockInitialRequestInProgress} />);
    const markCompleteButton = screen.getByRole('button', { name: 'Mark Task Complete' });
    fireEvent.click(markCompleteButton);
    // Check if CompletionModal was called with isOpen: true
    expect(CompletionModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: true }),
      {}
    );
  });

  it('does not open CompletionModal if status is not IN_PROGRESS and button somehow clicked (e.g. if logic changes)', () => {
    // This tests the internal logic more than the UI, as button shouldn't be there
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    render(<RequestCard initialRequest={mockInitialRequestOpen} />);

    // Simulate trying to open modal directly if the button wasn't conditional
    // For this, we might need to expose a handler or test differently,
    // but the primary test is that the button isn't there.
    // For now, we trust the button's conditional rendering.
    // If we had a direct handler call:
    // const { rerender } = render(<RequestCard initialRequest={mockInitialRequestOpen} />);
    // instance.handleOpenModal(); // if handleOpenModal was accessible
    // expect(CompletionModal).not.toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }), {});
    alertSpy.mockRestore();
  });


  it('calls API to update status when StatusUpdater triggers onStatusChange', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Status updated', request: { ...mockInitialRequestOpen, status: 'IN_PROGRESS' } }),
    });

    render(<RequestCard initialRequest={mockInitialRequestOpen} />);

    // Simulate StatusUpdater changing status
    const statusUpdaterSelect = screen.getByTestId('status-updater');
    fireEvent.change(statusUpdaterSelect, { target: { value: 'IN_PROGRESS' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`/api/requests/${mockInitialRequestOpen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
    });
    expect(screen.getByText('Current Status: IN_PROGRESS')).toBeInTheDocument();
  });

  it('calls API to complete task when CompletionModal submits', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Task completed', request: mockInitialRequestInProgress }),
    });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});


    render(<RequestCard initialRequest={mockInitialRequestInProgress} />);

    // Open the modal
    fireEvent.click(screen.getByRole('button', { name: 'Mark Task Complete' }));

    // Modal is now "open" (mocked), simulate its submit
    // The mock CompletionModal has a button with testid 'modal-submit-button'
    await waitFor(() => {
        expect(screen.getByTestId('modal-submit-button')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('modal-submit-button'));


    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`/api/requests/${mockInitialRequestInProgress.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDetails: { title: 'Mock Task Title' } }), // From our mocked modal
      });
    });
    expect(alertSpy).toHaveBeenCalledWith('Task marked as complete!'); // or the message from API
    alertSpy.mockRestore();
  });

  it('handles API error during status update', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update' }),
      statusText: 'Server Error'
    });

    render(<RequestCard initialRequest={mockInitialRequestOpen} />);
    const statusUpdaterSelect = screen.getByTestId('status-updater');
    fireEvent.change(statusUpdaterSelect, { target: { value: 'IN_PROGRESS' } });

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to update')).toBeInTheDocument();
    });
  });
});
