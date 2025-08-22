'use client'

import dynamic from 'next/dynamic'

// Enhanced branded loading component with better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4" role="status" aria-label="Loading component">
    <div className="relative">
      {/* Outer ring for visual depth */}
      <div className="h-6 w-6 rounded-full border-2 border-blue-100"></div>
      {/* Animated spinning ring */}
      <div className="absolute top-0 left-0 h-6 w-6 rounded-full border-2 border-transparent border-t-blue-600 animate-spin motion-reduce:animate-pulse"></div>
      {/* Center dot for branding */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse motion-reduce:animate-none"></div>
    </div>
    {/* Screen reader text */}
    <span className="sr-only">Loading component, please wait...</span>
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
