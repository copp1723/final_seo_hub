import React, { useState } from 'react';

interface StatusUpdaterProps {
  currentStatus: string;
  requestId: string;
  onStatusChange: (newStatus: string) => void;
}

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'DONE', 'ARCHIVED']; // Example statuses

const StatusUpdater: React.FC<StatusUpdaterProps> = ({ currentStatus, requestId, onStatusChange }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value;
    setSelectedStatus(newStatus);
    onStatusChange(newStatus); // Callback to parent component to handle actual update
  };

  return (
    <div className="status-updater">
      <select value={selectedStatus} onChange={handleChange} className="p-2 border rounded">
        {STATUS_OPTIONS.map(status => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StatusUpdater;
