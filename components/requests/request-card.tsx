import React, { useState, useEffect } from 'react';
import StatusUpdater from './status-updater';
import CompletionModal from './completion-modal';

// Define a type for the request data
interface RequestData {
  id: string;
  title: string;
  description: string;
  status: string; // e.g., 'OPEN', 'IN_PROGRESS', 'DONE', 'ARCHIVED'
  // Add other relevant fields like totalTasks, completedTaskCount if needed for UI
}

interface RequestCardProps {
  initialRequest: RequestData; // Accept initial request data as a prop
}

const RequestCard: React.FC<RequestCardProps> = ({ initialRequest }) => {
  const [request, setRequest] = useState<RequestData>(initialRequest);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to update card if initialRequest prop changes
  useEffect(() => {
    setRequest(initialRequest);
  }, [initialRequest]);

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    setError(null);
    console.log(`Attempting to update status for request ${request.id} to ${newStatus}`);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update status: ${response.statusText}`);
      }
      const updatedRequestData = await response.json();
      console.log('Status update successful:', updatedRequestData);
      setRequest(prev => ({ ...prev, status: newStatus })); // Update local state
      // Or better, use updatedRequestData.request if the API returns the full updated object
      // setRequest(updatedRequestData.request);
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (request.status === 'IN_PROGRESS') {
      setIsModalOpen(true);
    } else {
      alert('Task can only be marked complete if the request is IN_PROGRESS.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCompleteTask = async (completionDetails: { url?: string; title?: string; notes?: string }) => {
    if (!completionDetails.title) {
        alert("Title is required to mark a task as complete.");
        // Keep modal open or provide more specific feedback
        return;
    }
    setIsLoading(true);
    setError(null);
    console.log(`Attempting to complete task for request ${request.id}:`, completionDetails);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDetails: completionDetails }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to complete task: ${response.statusText}`);
      }
      const updatedRequestData = await response.json();
      console.log('Task completion successful:', updatedRequestData);
      // Potentially update local request state if the API returns new counts or tasks
      // For example, if the status automatically changes to DONE:
      // setRequest(updatedRequestData.request);
      alert(updatedRequestData.message || 'Task marked as complete!');
    } catch (err: any) {
      console.error('Error completing task:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsModalOpen(false); // Close modal on success or error
    }
  };

  return (
    <div className="border rounded-lg p-4 shadow-md bg-white max-w-sm">
      <h3 className="text-lg font-bold mb-2">{request.title} (ID: {request.id})</h3>
      <p className="text-sm text-gray-600 mb-1">Description: {request.description}</p>
      <p className="text-sm text-gray-600 mb-3">Current Status: <span className="font-semibold">{request.status}</span></p>

      {isLoading && <p className="text-blue-500">Updating...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="flex items-center space-x-2 mb-3">
        <span className="text-sm">Change Status:</span>
        <StatusUpdater
          requestId={request.id}
          currentStatus={request.status}
          onStatusChange={handleStatusChange}
        />
      </div>

      {request.status === 'IN_PROGRESS' && (
        <button
          onClick={handleOpenModal}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={isLoading}
        >
          Mark Task Complete
        </button>
      )}

      <CompletionModal
        isOpen={isModalOpen}
        requestId={request.id}
        onClose={handleCloseModal}
        onSubmit={handleCompleteTask}
      />
    </div>
  );
};

export default RequestCard;

// Example of how this card might be used in a page:
//
// import RequestCard from '@/components/requests/request-card';
//
// const MyPage = () => {
//   const sampleRequest = {
//     id: 'existing-request-id', // Use an ID that your mock API can find
//     title: 'Sample Request',
//     description: 'This is a test request card.',
//     status: 'IN_PROGRESS', // Initial status
//   };
//
//   return (
//     <div className="p-10">
//       <RequestCard initialRequest={sampleRequest} />
//     </div>
//   );
// };
//
// export default MyPage;
