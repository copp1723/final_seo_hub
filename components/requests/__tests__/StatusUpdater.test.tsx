import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusUpdater from '../status-updater';

describe('StatusUpdater', () => {
  const mockOnStatusChange = jest.fn();
  const requestId = 'test-request-123';
  const statusOptions = ['OPEN', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];

  beforeEach(() => {
    mockOnStatusChange.mockClear();
  });

  it('renders with the current status selected', () => {
    render(
      <StatusUpdater
        currentStatus="IN_PROGRESS"
        requestId={requestId}
        onStatusChange={mockOnStatusChange}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('IN_PROGRESS');
  });

  it('displays all status options', () => {
    render(
      <StatusUpdater
        currentStatus="OPEN"
        requestId={requestId}
        onStatusChange={mockOnStatusChange}
      />
    );
    statusOptions.forEach(status => {
      expect(screen.getByRole('option', { name: status })).toBeInTheDocument();
    });
  });

  it('calls onStatusChange with the new status when a different status is selected', () => {
    render(
      <StatusUpdater
        currentStatus="OPEN"
        requestId={requestId}
        onStatusChange={mockOnStatusChange}
      />
    );
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'DONE' } });

    expect(mockOnStatusChange).toHaveBeenCalledTimes(1);
    expect(mockOnStatusChange).toHaveBeenCalledWith('DONE');
  });

  it('updates the displayed value when a new status is selected', () => {
    render(
      <StatusUpdater
        currentStatus="OPEN"
        requestId={requestId}
        onStatusChange={mockOnStatusChange}
      />
    );
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'ARCHIVED' } });
    expect(selectElement).toHaveValue('ARCHIVED');
  });
});
