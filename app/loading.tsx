export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        {/* Enhanced branded spinner with better animation */}
        <div 
          className="relative mx-auto"
          aria-label="Loading content"
          role="status"
        >
          {/* Outer ring */}
          <div className="h-16 w-16 rounded-full border-4 border-blue-100"></div>
          {/* Animated inner ring */}
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
          {/* Center dot for branding */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-600 animate-pulse"></div>
        </div>
        <p className="mt-6 text-blue-700 font-medium">Loading...</p>
        {/* Accessibility text for screen readers */}
        <span className="sr-only">Please wait while the page loads</span>
      </div>
    </div>
  )
}
