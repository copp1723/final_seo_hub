'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import {
  Home,
  FileText,
  BarChart,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Settings,
  PlusCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBranding } from '@/hooks/use-branding'
import { DealershipSelector } from './dealership-selector'


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/requests', label: 'My Requests', icon: FileText },
  { href: '/focus-request', label: 'New Request', icon: PlusCircle },
  { href: '/reporting', label: 'Reports', icon: BarChart }
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const branding = useBranding()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
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

  // Admin navigation items - simplified
  const adminNavItems = user?.role === 'SUPER_ADMIN' || user?.role === 'AGENCY_ADMIN' ? [
    { href: '/admin', label: 'Admin', icon: Settings }
  ] : []

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center gap-2 lg:gap-6 flex-1">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-lg lg:text-xl font-medium text-gray-900 tracking-tight">
                {branding.companyName}
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/requests' && pathname?.startsWith('/requests/')) || (item.href === '/focus-request' && pathname?.startsWith('/focus-request'))
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
              {/* Admin Link */}
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname?.startsWith('/admin') || pathname?.startsWith('/super-admin')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-4 py-2 rounded-lg text-sm font-normal transition-all duration-200',
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
            </div>
          </div>

          {/* Right side: dealerships Selector, User menu */}
          <div className="flex items-center gap-2 lg:gap-4">
            <DealershipSelector />
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50/80 transition-colors duration-200">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ring-2 ring-white shadow-sm">
                    {session?.users.image ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                      />
                    ) : (
                      <users className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <span className="hidden lg:block text-sm text-gray-600 max-w-[150px] truncate font-normal">
                    {session?.user.name || 'User'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-700">{session?.user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{session?.user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === '/requests' && pathname?.startsWith('/requests/'))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                    isActive
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </div>
                </Link>
              )
            })}
            {/* Admin Links (Mobile) */}
            {adminNavItems.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
                {adminNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = pathname?.startsWith('/admin') || pathname?.startsWith('/super-admin')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                        isActive
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3" />
                        {item.label}
                      </div>
                    </Link>
                  )
                })}
              </>
            )}
          </div>
          
          {/* Mobile Dealership Selector */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4">
              <DealershipSelector />
            </div>
          </div>
          
          {/* Mobile User Info */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                  {session?.users.image ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                    />
                  ) : (
                    <users className="h-6 w-6 text-gray-600" />
                  )}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {session?.user.name || 'User'}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {session?.user.email}
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
