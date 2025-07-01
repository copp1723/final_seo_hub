'use client'; // This directive is often needed for pages that use client-side hooks like useState, useEffect

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // To get ID from URL in App Router

interface CompletedTask {
  id: string;
  title: string;
  url?: string;
  notes?: string;
  completedAt: string; // ISO date string
}

interface RequestDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  completedTasks: CompletedTask[];
  totalTasks?: number;
  completedTaskCount?: number;
  createdAt: string; // Assuming these fields exist
  updatedAt: string;
  completionDate?: string; // Date when the request was moved to DONE
}

const RequestDetailPage: React.FC = () => {
  const params = useParams();
  const id = params?.id as string; // Type assertion for id

  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchRequestDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/requests/${id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch request details: ${response.statusText}`);
          }
          const data: RequestDetails = await response.json();
          setRequestDetails(data);
        } catch (err) {
           console.error('Error fetching request details:', err);
           setError(err instanceof Error
             ? err.message
             : 'An unexpected error occurred'
           );
        }
          console.error('Error fetching request details:', err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }

      fetchRequestDetails();
    } else {
      // Handle case where id is not available yet, though useParams should provide it
      setIsLoading(false);
      setError("Request ID not found in URL.");
    }
  }, [id]);

  if (isLoading) {
    return <div className="p-10 text-center">Loading request details...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">Error: {error}</div>;
  }

  if (!requestDetails) {
    return <div className="p-10 text-center">Request not found.</div>;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{requestDetails.title}</h1>
        <p className="text-gray-500 text-sm mb-4">Request ID: {requestDetails.id}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><span className="font-semibold">Status:</span> {requestDetails.status}</div>
          <div><span className="font-semibold">Description:</span> {requestDetails.description}</div>
          <div><span className="font-semibold">Created At:</span> {formatDate(requestDetails.createdAt)}</div>
          <div><span className="font-semibold">Last Updated:</span> {formatDate(requestDetails.updatedAt)}</div>
          {requestDetails.status === 'DONE' && requestDetails.completionDate && (
            <div><span className="font-semibold">Completed On:</span> {formatDate(requestDetails.completionDate)}</div>
          )}
        </div>

        {requestDetails.totalTasks !== undefined && requestDetails.completedTaskCount !== undefined && (
          <div className="mb-4">
            <p className="font-semibold">Progress:</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(requestDetails.completedTaskCount / requestDetails.totalTasks) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{requestDetails.completedTaskCount} of {requestDetails.totalTasks} tasks completed.</p>
          </div>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Completed Tasks</h2>
        {requestDetails.completedTasks && requestDetails.completedTasks.length > 0 ? (
          <ul className="space-y-4">
            {requestDetails.completedTasks.map(task => (
              <li key={task.id} className="p-4 border rounded-md bg-gray-50">
                <h3 className="text-lg font-semibold text-green-700">{task.title}</h3>
                <p className="text-sm text-gray-500 mb-1">Completed: {formatDate(task.completedAt)}</p>
                {task.url && (
                  <p className="text-sm">
                    URL: <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{task.url}</a>
                  </p>
                )}
                {task.notes && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Notes:</span> {task.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No tasks have been marked as complete for this request yet.</p>
        )}
      </div>
    </div>
  );
};

export default RequestDetailPage;
