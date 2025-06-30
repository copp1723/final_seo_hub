'use client'

import { useEffect, useRef } from 'react'

interface DropdownProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Dropdown({ isOpen, onClose, children }: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div ref={dropdownRef} className="relative">
      {children}
    </div>
  )
}