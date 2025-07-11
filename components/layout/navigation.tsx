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
  Settings, // For system settings
  PlusCircle // For Bulk Create Dealerships
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBranding } from '@/hooks/use-branding'
import { DealershipSelector } from './dealership-selector'
import { UserImpersonation } from '@/components/admin/user-impersonation'
import Tooltip from '@/components/ui/tooltip'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, tooltip: 'Work items assigned to you or your team.' },
  { href: '/requests', label: 'Requests', icon: FileText, tooltip: 'Client-submitted SEO requests. Track status and progress.' },
  { href: '/chat', label: 'SEO Expert', icon: MessageSquare, tooltip: 'Chat with our AI-powered automotive SEO expert.' },
  { href: '/reporting', label: 'Analytics', icon: BarChart },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const branding = useBranding()
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
    { href: '/agency/settings', label: 'Agency Settings', icon: Settings },
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
    // Bulk create dealerships link
    { href: '/admin/bulk-create-dealerships', label: 'Bulk Create Dealerships', icon: PlusCircle },
  ] : []

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center gap-2 lg:gap-6 flex-1">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-lg lg:text-xl font-bold text-gray-900 tracking-tight">
                {branding.companyName}
              </Link>
            </div>

            {/* Desktop Navigation Links - Hidden on small screens */}
            <div className="hidden md:flex items-center gap-1 lg:gap-3">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/requests' && pathname?.startsWith('/requests/'))
                const link = (
                  <Link
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-2 lg:px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.label.split(' ')[0]}</span>
                  </Link>
                );
                return item.tooltip ? (
                  <Tooltip key={item.href} content={item.tooltip}>
                    {link}
                  </Tooltip>
                ) : (
                  <span key={item.href}>{link}</span>
                );
              })}

              {/* Agency Admin Dropdown (Desktop) */}
              {user?.role === 'AGENCY_ADMIN' && user.agencyId && agencyAdminNavItems.length > 0 && (
                <div className="ml-1 relative" ref={agencyMenuRef}>
                  <button
                    onClick={() => setIsAgencyMenuOpen(!isAgencyMenuOpen)}
                    className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    type="button"
                  >
                    <Briefcase className="h-4 w-4 mr-1.5" />
                    <span className="hidden xl:inline">Agency Admin</span>
                    <span className="xl:hidden">Agency</span>
                    <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isAgencyMenuOpen && "rotate-180")} />
                  </button>
                  {isAgencyMenuOpen && (
                    <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
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
                <div className="ml-1 relative" ref={superAdminMenuRef}>
                  <button
                    onClick={() => setIsSuperAdminMenuOpen(!isSuperAdminMenuOpen)}
                    className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    type="button"
                  >
                    <Settings className="h-4 w-4 mr-1.5" />
                    <span className="hidden xl:inline">Super Admin</span>
                    <span className="xl:hidden">Admin</span>
                    <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isSuperAdminMenuOpen && "rotate-180")} />
                  </button>
                  {isSuperAdminMenuOpen && (
                    <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
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

          {/* Right side: Agency Admin dropdown, Dealership Selector, User menu */}
          <div className="flex items-center gap-2 lg:gap-4">
            {user?.role === 'SUPER_ADMIN' && (
              <div className="hidden lg:block">
                <UserImpersonation />
              </div>
            )}
            <DealershipSelector />
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-gray-50">
                  <div className="h-7 w-7 rounded-full bg-gray-300 flex items-center justify-center">
                    {session?.user?.image ? (
                      <img
                        className="h-7 w-7 rounded-full"
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                      />
                    ) : (
                      <User className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <span className="hidden lg:block text-sm text-gray-700 max-w-[150px] truncate">
                    {session?.user?.name || 'User'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
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
          
          {/* Mobile Dealership Selector */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4 space-y-2">
              {user?.role === 'SUPER_ADMIN' && <UserImpersonation />}
              <DealershipSelector />
            </div>
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