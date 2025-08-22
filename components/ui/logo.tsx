import React from 'react'
import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10'
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Logo"
        width={120}
        height={32}
        className={`${sizeClasses[size]} w-auto object-contain`}
        priority
      />
    </div>
  )
}