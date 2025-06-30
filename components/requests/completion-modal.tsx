import React, { useState } from 'react';

interface CompletionModalProps {
  isOpen: boolean;
  requestId: string;
  onClose: () => void;
  onSubmit: (completionDetails: { url?: string; title?: string; notes?: string }) => void;
}

const CompletionModal: React.FC<CompletionModalProps> = ({ isOpen, requestId, onClose, onSubmit }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({ url, title, notes });
    // Reset fields and close modal
    setUrl('');
    setTitle('');
    setNotes('');
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
      <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Mark Task as Complete</h2>
        <p className="mb-4">Request ID: {requestId}</p>

        <div className="mb-4">
          <label htmlFor="completion-title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            id="completion-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="completion-url" className="block text-sm font-medium text-gray-700">URL (Optional)</label>
          <input
            type="url"
            id="completion-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="completion-notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            id="completion-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionModal;
