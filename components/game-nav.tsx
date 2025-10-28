'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth-actions'
import Image from 'next/image'
import {
  Home,
  Gamepad2,
  Wallet,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Send,
  Download,
  Upload,
  UserCog,
  ChevronDown,
  History,
} from 'lucide-react'
import { fr } from '@/lib/i18n'

interface UserProfile {
  id: string
  username: string
  email: string
  user_type: string // Ajout du user_type
}

interface Agent {
  id: string
  user_id: string
  is_active: boolean
}

const mainNavigation = [
  { name: fr.dashboard.overview, href: '/dashboard', icon: Home },
  { name: fr.dashboard.playGame, href: '/dashboard/game', icon: Gamepad2 },
  { name: fr.dashboard.wallet, href: '/dashboard/withdraw', icon: Wallet },
  { name: fr.dashboard.players, href: '/dashboard/players', icon: Users },
  { name: fr.dashboard.statistics, href: '/dashboard/stats', icon: BarChart3 },
]

// Navigation spécifique pour les wallets
const walletNavigation = [
  { name: fr.dashboard.accueil, href: '/dashboard', icon: Home },
  { name: fr.dashboard.envoyer, href: '/dashboard/send-money', icon: Send },
  { name: fr.dashboard.transactions, href: '/dashboard/transactions', icon: History },
]

export default function DashboardNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
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

      // Récupérer le user_type depuis le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, email, user_type')
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

  // Vérifier si l'utilisateur est un wallet
  const isWalletUser = userProfile?.user_type === 'wallet'

  const getRoleBasedLinks = () => {
    // Si c'est un wallet, retourner seulement les liens spécifiques
    if (isWalletUser) {
      return [
        { name: 'Send', href: '/dashboard/send-money', icon: Send },
        { name: 'Transactions', href: '/dashboard/transactions', icon: History },
        { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
      ]
    }

    // Pour les autres utilisateurs (players, etc.)
    const links = [
      { name: 'Dépôt', href: '/dashboard/deposit', icon: Upload },
      { name: 'Retrait', href: '/dashboard/withdraw', icon: Download },
      { name: 'Envoyer', href: '/dashboard/send-money', icon: Send },
      { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
    ]

    if (isAgent) {
      links.unshift({ name: 'Agent', href: '/dashboard/agent', icon: UserCog })
    }

    if (isAdmin) {
      links.unshift({ name: 'Admin', href: '/dashboard/admin', icon: Shield })
    }

    return links
  }

  // Obtenir la navigation principale selon le type d'utilisateur
  const getMainNavigation = () => {
    if (isWalletUser) {
      return walletNavigation
    }
    return mainNavigation
  }

  const handleSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
  }

  const displayName =
    userProfile?.username ||
    userProfile?.email?.split('@')[0] ||
    'Utilisateur'

  return (
    <>
      {/* ✅ Fixed Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and main nav */}
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity"
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src="/logo-betadame-blue.svg"
                  alt="BetaDame"
                  height={100}
                  width={100}
                  priority
                />
              </Link>

              {/* Desktop navigation */}
              <div className="hidden md:ml-8 md:flex md:space-x-1">
                {getMainNavigation().map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* User menu - Desktop */}
            <div className="hidden md:flex md:items-center">
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-transparent hover:border-gray-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {displayName}
                        </p>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                            isUserMenuOpen ? 'rotate-180' : 'rotate-0'
                          } group-hover:text-gray-700`}
                        />
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        {isWalletUser && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Wallet className="h-2.5 w-2.5 mr-0.5" />
                            Wallet
                          </span>
                        )}
                        {isAdmin && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Shield className="h-2.5 w-2.5 mr-0.5" />
                            Admin
                          </span>
                        )}
                        {isAgent && !isAdmin && !isWalletUser && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCog className="h-2.5 w-2.5 mr-0.5" />
                            Agent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Dropdown menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {displayName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {userProfile?.email}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isWalletUser && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Wallet
                          </span>
                        )}
                        {isAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Admin
                          </span>
                        )}
                        {isAgent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Agent
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-2">
                      {getRoleBasedLinks().map((item) => {
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

                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3 text-gray-400" />
                        {fr.auth.logout}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
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

        {/* ✅ Mobile menu scrollable */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 z-50 relative max-h-[80vh] overflow-y-auto">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {getMainNavigation().map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-3 text-base font-medium rounded-lg mx-2 transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}

              <div className="border-t border-gray-200 mt-2 pt-3">
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Actions
                  </p>
                  {getRoleBasedLinks().map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-3 py-3 text-base font-medium rounded-lg mx-2 transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
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
              </div>

              <div className="border-t border-gray-200 pt-3 px-4 mb-4">
                <div className="flex items-center space-x-3 py-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {userProfile?.email}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {isWalletUser && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Wallet
                        </span>
                      )}
                      {isAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Admin
                        </span>
                      )}
                      {isAgent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Agent
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  {fr.auth.logout}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay */}
        {(isUserMenuOpen || isOpen) && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsUserMenuOpen(false)
              setIsOpen(false)
            }}
          />
        )}
      </nav>

      {/* ✅ Page bottom spacing so content not hidden behind fixed navbar */}
      <div className="h-16 md:h-16" />
    </>
  )
}