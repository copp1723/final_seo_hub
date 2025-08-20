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
      <svg className={`${sizeClasses[size]} w-auto`} viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <style>
            {`.onekeel-text {
              font-family: Arial, sans-serif;
              font-weight: 300;
              fill: white;
            }
            .onekeel-wave {
              fill: none;
              stroke: white;
              stroke-width: 8;
              stroke-linecap: round;
            }`}
          </style>
        </defs>
        
        {/* OneKeel.ai Text */}
        <text x="20" y="45" className="onekeel-text" fontSize="42">OneKeel.ai</text>
        
        {/* Wave/Flow design element */}
        <path className="onekeel-wave" d="M20 65 Q100 75 180 65 T340 65" />
        <path className="onekeel-wave" d="M40 75 Q120 85 200 75 T360 75" opacity="0.6" strokeWidth="6" />
      </svg>
    </div>
  )
}