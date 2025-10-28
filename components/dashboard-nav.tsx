'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth-actions'
import Image from 'next/image'
import {
  Home,
  TrendingUp,
  BarChart3,
  Users,
  Trophy,
  Wallet,
  History,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Zap,
  Globe,
  Star,
  Bell,
  Search,
  Sparkles,
  MoreHorizontal,
  Award,
  TrendingDown,
} from 'lucide-react'
import { fr } from '@/lib/i18n'

interface UserProfile {
  id: string
  username: string
  email: string
  user_type: string
  balance?: number
}

interface Agent {
  id: string
  user_id: string
  is_active: boolean
}

// Main navigation - only essential links
const mainNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Markets', href: '/markets', icon: TrendingUp },
  { name: 'Portfolio', href: '/portfolio', icon: BarChart3 },
]

// Markets dropdown content
const marketsDropdown = [
  { name: 'Featured', href: '/markets/featured', icon: Star },
  { name: 'Sports', href: '/markets/sports', icon: Trophy },
  { name: 'Politics', href: '/markets/politics', icon: Globe },
  { name: 'Crypto', href: '/markets/crypto', icon: Zap },
  { name: 'All Markets', href: '/markets', icon: TrendingUp },
]

// Community dropdown content
const communityDropdown = [
  { name: 'Leaderboard', href: '/leaderboard', icon: Award },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Activity', href: '/activity', icon: History },
]

export default function TradingNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMarketsOpen, setIsMarketsOpen] = useState(false)
  const [isCommunityOpen, setIsCommunityOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAgent, setIsAgent] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  const supabase = createClient()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, email, user_type, balance')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)

        const { data: agent } = await supabase
          .from('agents')
          .select('id, user_id, is_active')
          .eq('user_id', user.id)
          .single()

        setIsAgent(!!agent)
        setIsAdmin(user.email === 'gerardkasemba@gmail.com')
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Simplified user menu links
  const getUserMenuLinks = () => {
    const links = [
      { name: 'Portfolio', href: '/portfolio', icon: BarChart3 },
      { name: 'Wallet', href: '/wallet', icon: Wallet },
      { name: 'Trade History', href: '/history', icon: History },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]

    if (isAdmin) {
      links.unshift({ name: 'Admin', href: '/admin', icon: Shield })
    }
    if (isAgent) {
      links.unshift({ name: 'Agent', href: '/agent', icon: User })
    }

    return links
  }

  const handleSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
  }

  const displayName =
    userProfile?.username ||
    userProfile?.email?.split('@')[0] ||
    'Trader'

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(balance)
  }

  // Check if a path is active for dropdowns
  const isPathActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <>
      {/* Trading Platform Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and main nav */}
            <div className="flex items-center space-x-8">
              <Link
                href="/"
                className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src="/logo-betadame-blue.svg"
                  alt="Trading Platform"
                  height={100}
                  width={100}
                  priority
                  className="h-20 w-20"
                />
              </Link>

              {/* Desktop navigation */}
              <div className="hidden lg:flex lg:space-x-1">
                {/* Main Links */}
                {mainNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}

                {/* Markets Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsMarketsOpen(!isMarketsOpen)}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isPathActive('/markets')
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Markets
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${
                      isMarketsOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {isMarketsOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {marketsDropdown.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsMarketsOpen(false)}
                          >
                            <Icon className="h-4 w-4 mr-3 text-gray-400" />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Community Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsCommunityOpen(!isCommunityOpen)}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isPathActive('/community') || isPathActive('/leaderboard')
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Community
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${
                      isCommunityOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {isCommunityOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {communityDropdown.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsCommunityOpen(false)}
                          >
                            <Icon className="h-4 w-4 mr-3 text-gray-400" />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search and User Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors w-64"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {/* Balance Display */}
              {userProfile?.balance !== undefined && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {formatBalance(userProfile.balance)}
                  </span>
                </div>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-transparent hover:border-gray-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {displayName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {userProfile?.email}
                      </p>
                      {userProfile?.balance !== undefined && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">
                            {formatBalance(userProfile.balance)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* User Links */}
                    <div className="py-2">
                      {getUserMenuLinks().map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Icon className="h-4 w-4 mr-3 text-gray-400" />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3 text-gray-400" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Mobile Balance */}
              {userProfile?.balance !== undefined && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                  <Wallet className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    ${userProfile.balance.toFixed(0)}
                  </span>
                </div>
              )}

              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 z-50 relative max-h-[80vh] overflow-y-auto">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Main Navigation */}
              {mainNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-3 text-base font-medium rounded-lg mx-2 transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}

              {/* Markets Section */}
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Markets
                </p>
                {marketsDropdown.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-3 text-base font-medium rounded-lg mx-2 transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>

              {/* Community Section */}
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Community
                </p>
                {communityDropdown.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-3 text-base font-medium rounded-lg mx-2 transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>

              {/* User Section */}
              <div className="border-t border-gray-200 pt-3 px-4 mb-4">
                <div className="flex items-center space-x-3 py-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {userProfile?.email}
                    </p>
                    {userProfile?.balance !== undefined && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Wallet className="h-3 w-3 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          {formatBalance(userProfile.balance)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Links */}
                {getUserMenuLinks().map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-3 text-base font-medium rounded-lg mx-2 transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}

                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mt-2"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay */}
        {(isUserMenuOpen || isMarketsOpen || isCommunityOpen || isOpen) && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsUserMenuOpen(false)
              setIsMarketsOpen(false)
              setIsCommunityOpen(false)
              setIsOpen(false)
            }}
          />
        )}
      </nav>

      {/* Page bottom spacing */}
      <div className="h-16" />
    </>
  )
}