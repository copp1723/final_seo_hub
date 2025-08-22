import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      { ...props}
    />
  )
}

// Enhanced skeleton with branded blue shimmer effect
function BrandedSkeleton({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{
        background: 'linear-gradient(90deg, #eff6ff 25%, #dbeafe 50%, #eff6ff 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite'
      }}
      {...props}
    />
  )
}

export { Skeleton, BrandedSkeleton }
