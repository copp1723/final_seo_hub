export function LoadingSpinner({
  size = 'md',
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }
  
  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${className}`} />
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}