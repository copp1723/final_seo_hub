'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/simple-auth-provider'
import {
  Home,
  FileText,
  BarChart,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  MessageSquare,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DealershipSelector } from './dealership-selector'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/requests', label: 'Requests', icon: FileText },
  { href: '/chat', label: 'SEO Assistant', icon: MessageSquare },
  { href: '/tasks', label: 'Tasks', icon: Settings },
  { href: '/reporting', label: 'Reports', icon: BarChart }
]

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isUserMenuOpen])

  // Admin navigation items
  const adminNavItems = user?.role === 'SUPER_ADMIN' || user?.role === 'AGENCY_ADMIN' ? [
    { href: user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/admin', label: 'Admin', icon: Shield }
  ] : []

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center gap-2 lg:gap-6 flex-1">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight hover:from-blue-700 hover:to-indigo-700 transition-all duration-200">
                SEO Hub
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href === '/requests' && (pathname?.startsWith('/requests/') || pathname?.startsWith('/focus-request'))) ||
                  (item.href === '/chat' && pathname?.startsWith('/chat'))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-4 py-2 rounded-lg text-sm font-normal transition-all duration-200 relative',
                      isActive
                        ? 'text-blue-700 bg-blue-50/80 shadow-sm border border-blue-200/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Link>
                )
              })}
              
              {/* Admin Links */}
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-4 py-2 rounded-lg text-sm font-normal transition-all duration-200 relative',
                      isActive
                        ? 'text-purple-700 bg-purple-50/80 shadow-sm border border-purple-200/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Dealership Selector and User Menu */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Dealership Selector */}
            <DealershipSelector />
            
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-white shadow-sm">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-medium text-gray-700">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.role || 'USER'}
                  </div>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg py-1 bg-white backdrop-blur-md ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200/60" style={{ zIndex: 9999 }}>
                  <div className="px-4 py-3 border-b border-gray-200/60">
                    <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50/80 transition-colors duration-200"
                  >
                    <Settings className="h-4 w-4 mr-3 text-gray-400" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleSignOut()
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50/80 transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-3 text-gray-400" />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200/60">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href === '/requests' && (pathname?.startsWith('/requests/') || pathname?.startsWith('/focus-request'))) ||
                (item.href === '/chat' && pathname?.startsWith('/chat'))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200',
                    isActive
                      ? 'text-blue-700 bg-blue-50/80'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              )
            })}
            
            {/* Mobile Admin Links */}
            {adminNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200',
                    isActive
                      ? 'text-purple-700 bg-purple-50/80'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              )
            })}
          </div>
          
          {/* Mobile User Info */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {user?.name || 'User'}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/settings"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="h-5 w-5 inline mr-2" />
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
