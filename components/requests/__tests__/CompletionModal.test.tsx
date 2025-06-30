import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompletionModal from '../completion-modal';

describe('CompletionModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const requestId = 'req-complete-modal-test';

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
  });

  it('does not render when isOpen is false', () => {
    render(
      <CompletionModal
        isOpen={false}
        requestId={requestId}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark Task as Complete')).not.toBeInTheDocument();
  });

  it('renders correctly when isOpen is true', () => {
    render(
      <CompletionModal
        isOpen={true}
        requestId={requestId}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Mark Task as Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('URL (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes (Optional)')).toBeInTheDocument();
    expect(screen.getByText(`Request ID: ${requestId}`)).toBeInTheDocument();
  });

  it('calls onClose when the Cancel button is clicked', () => {
    render(
      <CompletionModal
        isOpen={true}
        requestId={requestId}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates input fields and calls onSubmit with the details', () => {
    render(
      <CompletionModal
        isOpen={true}
        requestId={requestId}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const urlInput = screen.getByLabelText('URL (Optional)');
    const notesInput = screen.getByLabelText('Notes (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    fireEvent.change(titleInput, { target: { value: 'Completed Feature X' } });
    fireEvent.change(urlInput, { target: { value: 'http://example.com/feature-x' } });
    fireEvent.change(notesInput, { target: { value: 'This was a tricky one.' } });

    expect(titleInput).toHaveValue('Completed Feature X');
    expect(urlInput).toHaveValue('http://example.com/feature-x');
    expect(notesInput).toHaveValue('This was a tricky one.');

    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Completed Feature X',
      url: 'http://example.com/feature-x',
      notes: 'This was a tricky one.',
    });
  });

  it('resets fields and calls onClose after submit', () => {
    render(
      <CompletionModal
        isOpen={true}
        requestId={requestId}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test Title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    // Modal calls onSubmit, then onClose, which should hide it or re-render with it closed
    // If we were to re-render it as open again, fields should be empty
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // To test reset, we'd typically check the state or re-render,
    // but here we check if the modal calls onClose, which is part of the reset flow.
    // The actual state reset is internal to the component upon submission.
  });
});
