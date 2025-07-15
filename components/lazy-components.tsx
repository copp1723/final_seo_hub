'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
  </div>
)

// Lazy load heavy components
export const LazyChart = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Chart),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyLineChart = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyBarChart = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Bar),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyDoughnutChart = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Doughnut),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load SEO Chat component
export const LazySEOChat = dynamic(
  () => import('@/components/chat/seo-chat').then(mod => ({ default: mod.SEOChat })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load Modal components
export const LazyEscalationModal = dynamic(
  () => import('@/components/chat/escalation-modal').then(mod => ({ default: mod.EscalationModal })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)
