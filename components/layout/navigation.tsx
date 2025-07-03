'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import {
  Home,
  FileText,
  MessageSquare,
  BarChart,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  ListChecks,
  Users, // For Manage Agency Users
  Briefcase, // For Agency Admin section or specific agency views
  Building2, // For agencies
  Settings // For system settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/requests', label: 'Requests', icon: FileText },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { href: '/reporting', label: 'Analytics', icon: BarChart },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isAgencyMenuOpen, setIsAgencyMenuOpen] = useState(false) // For Agency Admin dropdown
  const [isSuperAdminMenuOpen, setIsSuperAdminMenuOpen] = useState(false) // For Super Admin dropdown
  const userMenuRef = useRef<HTMLDivElement>(null)
  const agencyMenuRef = useRef<HTMLDivElement>(null)
  const superAdminMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (agencyMenuRef.current && !agencyMenuRef.current.contains(event.target as Node)) {
        setIsAgencyMenuOpen(false)
      }
      if (superAdminMenuRef.current && !superAdminMenuRef.current.contains(event.target as Node)) {
        setIsSuperAdminMenuOpen(false)
      }
    }

    if (isUserMenuOpen || isAgencyMenuOpen || isSuperAdminMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isUserMenuOpen, isAgencyMenuOpen, isSuperAdminMenuOpen])

  const agencyAdminNavItems = user?.role === 'AGENCY_ADMIN' && user.agencyId ? [
    { href: `/admin/agencies/${user.agencyId}/requests`, label: 'All Dealership Requests', icon: Briefcase },
    { href: `/admin/agencies/${user.agencyId}/users`, label: 'Manage Agency Users', icon: Users },
  ] : []

  // Super Admin navigation items
  const superAdminNavItems = user?.role === 'SUPER_ADMIN' ? [
    { href: '/super-admin', label: 'Super Admin Dashboard', icon: Briefcase },
    { href: '/super-admin/users', label: 'All Users', icon: Users },
    { href: '/super-admin/agencies', label: 'All Agencies', icon: Building2 },
    { href: '/super-admin/system', label: 'System Settings', icon: Settings },
    { href: '/super-admin/audit', label: 'Audit Logs', icon: FileText },
  ] : []

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Rylie SEO Hub
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/requests' && pathname?.startsWith('/requests/'))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                )
              })}

              {/* Agency Admin Dropdown (Desktop) */}
              {user?.role === 'AGENCY_ADMIN' && user.agencyId && agencyAdminNavItems.length > 0 && (
                <div className="ml-3 relative" ref={agencyMenuRef}>
                  <button
                    onClick={() => setIsAgencyMenuOpen(!isAgencyMenuOpen)}
                    className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 cursor-pointer"
                    type="button"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Agency Admin
                    <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", isAgencyMenuOpen && "rotate-180")} />
                  </button>
                  {isAgencyMenuOpen && (
                    <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50" style={{ pointerEvents: 'auto' }}>
                      {agencyAdminNavItems.map(item => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                           <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100',
                              isActive && 'bg-gray-100'
                            )}
                            onClick={() => setIsAgencyMenuOpen(false)}
                          >
                            <span className="flex items-center">
                              <Icon className="h-4 w-4 mr-2" />
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Super Admin Dropdown (Desktop) */}
              {user?.role === 'SUPER_ADMIN' && superAdminNavItems.length > 0 && (
                <div className="ml-3 relative" ref={superAdminMenuRef}>
                  <button
                    onClick={() => setIsSuperAdminMenuOpen(!isSuperAdminMenuOpen)}
                    className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 cursor-pointer"
                    type="button"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Super Admin
                    <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", isSuperAdminMenuOpen && "rotate-180")} />
                  </button>
                  {isSuperAdminMenuOpen && (
                    <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50" style={{ pointerEvents: 'auto' }}>
                      {superAdminNavItems.map(item => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                           <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100',
                              isActive && 'bg-gray-100'
                            )}
                            onClick={() => setIsSuperAdminMenuOpen(false)}
                          >
                            <span className="flex items-center">
                              <Icon className="h-4 w-4 mr-2" />
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50">
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    {session?.user?.image ? (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <span className="text-gray-700">{session?.user?.name || 'User'}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-700">{session?.user?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{session?.user?.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
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
          <div className="flex items-center sm:hidden">
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

            {/* Agency Admin Links (Mobile) */}
            {user?.role === 'AGENCY_ADMIN' && user.agencyId && agencyAdminNavItems.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Agency Admin
                  </h3>
                </div>
                {agencyAdminNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
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

            {/* Super Admin Links (Mobile) */}
            {user?.role === 'SUPER_ADMIN' && superAdminNavItems.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Super Admin
                  </h3>
                </div>
                {superAdminNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
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
          
          {/* Mobile User Info */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                  {session?.user?.image ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-600" />
                  )}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {session?.user?.name || 'User'}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {session?.user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/settings"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
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