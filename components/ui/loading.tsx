export function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Loading'
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}) {
  const sizeConfig = {
    sm: { outer: 'h-4 w-4', inner: 'h-4 w-4', center: 'h-1 w-1', border: 'border-2' },
    md: { outer: 'h-8 w-8', inner: 'h-8 w-8', center: 'h-2 w-2', border: 'border-2' },
    lg: { outer: 'h-12 w-12', inner: 'h-12 w-12', center: 'h-3 w-3', border: 'border-4' }
  }
  
  const config = sizeConfig[size]
  
  return (
    <div className="flex items-center justify-center">
      <div 
        className={`relative ${className}`}
        aria-label={label}
        role="status"
      >
        {/* Outer ring for better visual depth */}
        <div className={`${config.outer} rounded-full ${config.border} border-blue-100`}></div>
        {/* Animated spinning ring */}
        <div className={`absolute top-0 left-0 ${config.inner} rounded-full ${config.border} border-transparent border-t-blue-600 animate-spin motion-reduce:animate-pulse`}></div>
        {/* Center dot for branding */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${config.center} rounded-full bg-blue-600 animate-pulse motion-reduce:animate-none`}></div>
        {/* Screen reader text */}
        <span className="sr-only">{label}</span>
      </div>
    </div>
  )
}

export function PageLoading({ message = 'Loading page...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50">
      <div className="text-center">
        <LoadingSpinner size="lg" label={message} />
        <p className="mt-4 text-blue-700 font-medium">{message}</p>
      </div>
    </div>
  )
}
