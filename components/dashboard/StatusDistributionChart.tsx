'use client'

import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

interface StatusDistributionChartProps {
  statusCounts: Record<string, number>
}

// Define a mapping for status colors - can be expanded or customized
const statusColors: Record<string, string> = {
  PENDING: '#FFC107', // Amber
  IN_PROGRESS: '#2196F3', // Blue
  COMPLETED: '#4CAF50', // Green
  CANCELLED: '#F44336', // Red
  ON_HOLD: '#FF9800', // Orange
  REQUIRES_REVIEW: '#9C27B0', // Purple
  // Add more statuses and colors as needed
}

const defaultColor = '#9E9E9E' // Grey for unknown statuses

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ statusCounts }) => {
  const labels = Object.keys(statusCounts)
  const dataValues = Object.values(statusCounts)
  const backgroundColors = labels.map(label => statusColors[label] || defaultColor)

  const data = {
    labels: labels.map(label => label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())), // Format labels for display
    datasets: [
      {
        label: 'Request Statuses',
        data: dataValues,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => `${color}B3`), // Add some transparency to border
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false, // Using CardTitle instead
        text: 'Request Status Distribution',
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed !== null) {
              label += context.parsed
            }
            return label
          },
        },
      },
    },
  }

  // Check if there's any data to display
  const hasData = dataValues.some(value => value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-72 lg:h-80"> {/* Adjust height as needed */}
          {hasData ? (
            <Doughnut data={data} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No request data available.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default StatusDistributionChart
