// app/dashboard/page.tsx - COMPLETE CODE
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import QuickStats from '@/components/quick-stats'
import RecentGames from '@/components/recent-games'
import BalanceCard from '@/components/balance-card'
import QuickActions from '@/components/quick-actions'
import { Gamepad2, TrendingUp, Users, Trophy, DollarSign, Clock, Award, Star, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { fr } from '@/lib/i18n'
import { DashboardData } from '@/types/game'
import { AlertCircle } from 'lucide-react'

// Throttle function to prevent excessive updates
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userRegion, setUserRegion] = useState<string>('Congo')
  const [userId, setUserId] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  // Memoized data fetching function
  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('🔄 Fetching dashboard data...')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Auth error:', authError)
        router.push('/auth/login')
        return
      }

      // Set userId for use in components
      setUserId(user.id)

      // Fetch all data in parallel
      const [
        profileResponse,
        userGamesResponse,
        wonGamesResponse,
        activePlayersResponse,
        userGameParticipationsResponse,
        transactionsResponse
      ] = await Promise.all([
        // FIXED: Include id in the profile query
        supabase
          .from('profiles')
          .select('id, balance, username, region, state, phone_number, created_at')
          .eq('id', user.id)
          .single(),

        supabase
          .from('game_participants')
          .select('game_room_id', { count: 'exact' })
          .eq('user_id', user.id),

        supabase
          .from('game_rooms')
          .select('id')
          .eq('winner_id', user.id),

        supabase
          .from('game_participants')
          .select('user_id', { count: 'exact' })
          .gte('joined_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

        supabase
          .from('game_participants')
          .select('game_room_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(20), // Increased limit for better data

        supabase
          .from('transactions')
          .select('amount, type, status, created_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
      ])

      // Check for errors in responses
      if (profileResponse.error) {
        console.error('Profile error:', profileResponse.error)
        throw profileResponse.error
      }
      if (userGamesResponse.error) {
        console.error('User games error:', userGamesResponse.error)
        throw userGamesResponse.error
      }

      const profile = profileResponse.data
      const userGames = userGamesResponse.data
      const wonGames = wonGamesResponse.data
      const activePlayersCount = activePlayersResponse.count || 0
      const userGameParticipations = userGameParticipationsResponse.data || []
      const transactions = transactionsResponse.data || []

      // Calculate game statistics
      const totalGames = userGamesResponse.count || 0
      const totalWins = wonGames?.length || 0
      const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

      // Calculate total wagered
      let totalWagered = 0
      if (userGames && userGames.length > 0) {
        const gameIds = userGames.map(g => g.game_room_id)
        const { data: userGameRooms } = await supabase
          .from('game_rooms')
          .select('bet_amount')
          .in('id', gameIds)
        
        totalWagered = userGameRooms?.reduce((total, game) => total + (game.bet_amount || 0), 0) || 0
      }

      // Calculate total winnings
      let totalWinnings = 0
      if (wonGames && wonGames.length > 0) {
        const wonGameIds = wonGames.map(g => g.id)
        const { data: wonGameRooms } = await supabase
          .from('game_rooms')
          .select('bet_amount, current_players')
          .in('id', wonGameIds)
        
        totalWinnings = wonGameRooms?.reduce((total, game) => {
          const prize = game.bet_amount * (game.current_players || 2)
          return total + prize
        }, 0) || 0
      }

      // Calculate average game time
      const { data: userMoves } = await supabase
        .from('game_moves')
        .select('created_at, game_room_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      let averageGameTime = 15
      if (userMoves && userMoves.length > 1) {
        const gameDurations: number[] = []
        const movesByGame = userMoves.reduce((acc, move) => {
          if (!acc[move.game_room_id]) {
            acc[move.game_room_id] = []
          }
          acc[move.game_room_id].push(new Date(move.created_at).getTime())
          return acc
        }, {} as Record<string, number[]>)

        Object.values(movesByGame).forEach(gameMoves => {
          if (gameMoves.length > 1) {
            const duration = Math.max(...gameMoves) - Math.min(...gameMoves)
            gameDurations.push(duration / (1000 * 60))
          }
        })

        if (gameDurations.length > 0) {
          averageGameTime = Math.round(gameDurations.reduce((a, b) => a + b, 0) / gameDurations.length)
        }
      }

      // Calculate player level
      const playerLevel = Math.floor((totalGames || 0) / 5) + Math.floor((totalWins || 0) / 3) + 1

      // Fetch recent games data with participants for the enhanced RecentGames component
      const userGameIds = userGameParticipations.map(p => p.game_room_id)
      
      // Enhanced query to include participants data
      const { data: recentGamesData } = userGameIds.length > 0 ? await supabase
        .from('game_rooms')
        .select(`
          *,
          participants:game_participants(user_id, player_number)
        `)
        .in('id', userGameIds)
        .order('created_at', { ascending: false }) : { data: [] }

      // Fetch creator profiles
      const creatorIds = recentGamesData?.map(game => game.created_by).filter(Boolean) || []
      const { data: creatorProfiles } = creatorIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, username, state')
        .in('id', creatorIds) : { data: [] }

      // Format recent games with participants data
      const recentGames = recentGamesData?.map(game => {
        const creator = creatorProfiles?.find(profile => profile.id === game.created_by)
        
        return {
          id: game.id,
          name: game.name,
          bet_amount: game.bet_amount,
          status: game.status,
          winner_id: game.winner_id,
          current_players: game.current_players,
          max_players: game.max_players,
          game_type: game.game_type, // Added for game type detection
          created_at: game.created_at,
          profiles: creator ? { username: creator.username } : undefined,
          participants: game.participants // Added for participant checking
        }
      }) || []

      // Calculate balance from transactions
      const calculatedBalance = transactions.reduce((total, transaction) => {
        if (transaction.type === 'deposit' || transaction.type === 'game_win') {
          return total + transaction.amount
        } else if (transaction.type === 'withdrawal' || transaction.type === 'game_bet') {
          return total - transaction.amount
        }
        return total
      }, 0)

      const actualBalance = profile?.balance || 0

      const dashboardData: DashboardData = {
        profile,
        stats: {
          totalGames,
          totalWins,
          winRate,
          totalWagered,
          totalWinnings,
          averageGameTime,
          activePlayersCount,
          playerLevel
        },
        recentGames,
        transactions,
        userId: user.id
      }

      setDashboardData(dashboardData)
      setConnectionError('')
      console.log('✅ Dashboard data loaded successfully')

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
      setConnectionError('Erreur de chargement des données')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [supabase, router])

  // Get user's region from browser
  const detectUserRegion = useCallback(async () => {
    try {
      // Try to get region from browser
      if (navigator.language) {
        const language = navigator.language.toLowerCase()
        if (language.includes('fr')) {
          setUserRegion('Congo')
        } else if (language.includes('en')) {
          setUserRegion('International')
        }
      }

      // Fallback to IP-based geolocation
      try {
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        
        if (data.country_code === 'CG') {
          setUserRegion('Congo')
        } else if (data.country_code === 'CD') {
          setUserRegion('RDC')
        } else {
          setUserRegion('International')
        }
      } catch (ipError) {
        console.log('Could not detect region from IP, using browser language')
      }
    } catch (error) {
      console.log('Could not detect region, using default: Congo')
      setUserRegion('Congo')
    }
  }, [])

  // Throttled version of fetchDashboardData for real-time updates
  const throttledFetchData = useCallback(
    throttle(() => {
      console.log('🔄 Real-time update triggered')
      fetchDashboardData()
    }, 2000), // Throttle to max once every 2 seconds
    [fetchDashboardData]
  )

  // Enhanced real-time subscription setup
  const setupRealTimeSubscriptions = useCallback(() => {
    if (!userId) {
      console.log('⏳ Waiting for userId before setting up subscriptions...')
      return () => {}
    }

    console.log('🔌 Setting up real-time subscriptions for user:', userId)
    
    const channel = supabase.channel('dashboard-updates', {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    })
    
    // Profile changes (balance updates) - only for current user
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        console.log('📊 Profile updated:', payload)
        throttledFetchData()
      }
    )

    // Game participant changes - only for current user
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_participants',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🎮 Game participation updated:', payload)
        throttledFetchData()
      }
    )

    // Game room changes - listen to relevant game rooms
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms'
      },
      (payload) => {
        console.log('🏠 Game room updated:', payload)
        throttledFetchData()
      }
    )

    // Transaction changes - only for current user
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('💰 Transaction updated:', payload)
        throttledFetchData()
      }
    )

    // Game moves changes - only for current user
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_moves',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('♟️ Game move updated:', payload)
        throttledFetchData()
      }
    )

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('📡 Real-time subscription status:', status)
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time subscriptions active')
        setIsConnected(true)
        setConnectionError('')
      }
      
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Real-time subscription error:', status)
        setIsConnected(false)
        setConnectionError('Connexion temps-réel perdue')
      }

      if (status === 'CLOSED') {
        console.log('🔴 Real-time subscription closed')
        setIsConnected(false)
      }
    })

    return () => {
      console.log('🧹 Cleaning up real-time subscriptions')
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [supabase, userId, throttledFetchData])

  // Initialize dashboard data and subscriptions
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let mounted = true

    const initializeDashboard = async () => {
      try {
        console.log('🚀 Initializing dashboard...')
        await fetchDashboardData()
        
        if (mounted) {
          // Setup real-time subscriptions after data is loaded
          unsubscribe = setupRealTimeSubscriptions()
        }
      } catch (error) {
        console.error('❌ Dashboard initialization failed:', error)
        if (mounted) {
          setConnectionError('Échec de l\'initialisation')
        }
      }
    }

    initializeDashboard()

    return () => {
      mounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [fetchDashboardData, setupRealTimeSubscriptions])

  // Get user's region from browser
  useEffect(() => {
    detectUserRegion()
  }, [detectUserRegion])

  const refreshData = () => {
    console.log('🔄 Manual refresh triggered')
    setRefreshing(true)
    fetchDashboardData()
  }

  // Connection status component
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-2 text-sm">
      {isConnected ? (
        <Wifi className="h-4 w-4 text-green-400" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-400" />
      )}
      <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
        {isConnected ? 'Connecté' : 'Déconnecté'}
      </span>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement de votre tableau de bord...</p>
          {connectionError && (
            <p className="text-red-500 text-sm mt-2">{connectionError}</p>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erreur lors du chargement des données</p>
          {connectionError && (
            <p className="text-red-500 text-sm mt-2">{connectionError}</p>
          )}
          <button 
            onClick={fetchDashboardData}
            className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const { profile, stats, recentGames, transactions } = dashboardData

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
<div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white">
  <div className="space-y-4 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
    {/* Left Section - User Info */}
    <div className="flex-1 space-y-3">
      {/* Top Row - Welcome & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading leading-tight">
            {fr.common.welcome},
          </h1>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading leading-tight truncate">
            {profile?.username || 'Joueur'}!
          </h2>
        </div>
        
        {/* Action Buttons - Desktop */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            title="Actualiser les données"
            aria-label="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <ConnectionStatus />
        </div>
      </div>

      {/* User Stats & Info */}
      <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
        {/* Level Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
          <Star className="h-4 w-4 text-yellow-300" />
          <span className="font-semibold">Niveau {stats.playerLevel}</span>
        </div>
        
        {/* Location Badge */}
        {profile?.state && (
          <div className="inline-flex items-center px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
            <span className="font-medium">{profile.state}</span>
          </div>
        )}
        
        {/* Member Since - Hidden on small mobile */}
        <div className="hidden xs:inline-flex items-center px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
          <span className="text-blue-100">
            Membre depuis {new Date(profile?.created_at || Date.now()).toLocaleDateString('fr-FR', { 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {/* Action Buttons - Mobile Only */}
      <div className="flex sm:hidden items-center gap-2">
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 rounded-xl hover:bg-white/30 active:scale-95 transition-all disabled:opacity-50 backdrop-blur-sm border border-white/30"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </span>
        </button>
        <div className="flex-shrink-0">
          <ConnectionStatus />
        </div>
      </div>

      {/* Status Messages */}
      {connectionError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-200 flex-shrink-0 mt-0.5" />
          <p className="text-red-100 text-sm flex-1">{connectionError}</p>
        </div>
      )}
      
      {refreshing && !connectionError && (
        <div className="flex items-center gap-2 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
          <p className="text-blue-100 text-sm">Actualisation en cours...</p>
        </div>
      )}
    </div>

    {/* Right Section - Level Display (Desktop & Tablet) */}
    <div className="hidden sm:flex flex-col items-end justify-center text-right flex-shrink-0 ml-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          {/* Glowing effect */}
          <div className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-50 animate-pulse" />
          <div className="relative flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-sm rounded-2xl border-2 border-yellow-300/50">
            <Star className="h-8 w-8 lg:h-10 lg:w-10 text-yellow-300 fill-yellow-300" />
          </div>
        </div>
        <div>
          <div className="text-4xl lg:text-5xl font-bold leading-none">
            {stats.playerLevel}
          </div>
          <p className="text-sm text-blue-200 mt-1">Votre niveau</p>
        </div>
      </div>
      
      {/* Progress to next level (optional) */}
      <div className="w-full mt-2">
        <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${((stats.totalGames % 5) / 5) * 100}%` }}
          />
        </div>
        <p className="text-xs text-blue-200 mt-1 text-right">
          {5 - (stats.totalGames % 5)} parties jusqu'au niveau {stats.playerLevel + 1}
        </p>
      </div>
    </div>

    {/* Mobile Level Card */}
    <div className="flex sm:hidden items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-300 rounded-full blur-lg opacity-50" />
          <div className="relative flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl border-2 border-yellow-300/50">
            <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
          </div>
        </div>
        <div>
          <p className="text-sm text-blue-200">Votre niveau</p>
          <div className="text-3xl font-bold leading-none">
            {stats.playerLevel}
          </div>
        </div>
      </div>
      
      {/* Mini progress */}
      <div className="text-right">
        <p className="text-xs text-blue-200 mb-1">Prochain niveau</p>
        <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full"
            style={{ width: `${((stats.totalGames % 5) / 5) * 100}%` }}
          />
        </div>
        <p className="text-xs text-blue-200 mt-1">
          {5 - (stats.totalGames % 5)} parties
        </p>
      </div>
    </div>
  </div>
</div>


      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <QuickStats
          title="Parties Jouées"
          value={stats.totalGames.toString()}
          icon={<Gamepad2 className="h-4 w-4" />}
          color="blue"
        />
        <QuickStats
          title="Victoires"
          value={stats.totalWins.toString()}
          icon={<Trophy className="h-4 w-4" />}
          color="green"
        />
        <QuickStats
          title="Taux de Gain"
          value={`${stats.winRate}%`}
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          color="accent"
        />
        <QuickStats
          title="Total Misé"
          value={`${stats.totalWagered.toFixed(0)}`}
          icon={<DollarSign className="h-4 w-4" />}
          color="purple"
        />
        <QuickStats
          title="Temps Moyen"
          value={`${stats.averageGameTime}min`}
          icon={<Clock className="h-4 w-4" />}
          color="orange"
        />
        <QuickStats
          title="Joueurs Actifs (24h)"
          value={stats.activePlayersCount.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          color="red"
        />
        <QuickStats
          title="Gains Total"
          value={`${stats.totalWinnings.toFixed(0)}`}
          icon={<Award className="h-4 w-4" />}
          color="emerald"
        />
        <QuickStats
          title="Niveau"
          value={stats.playerLevel.toString()}
          icon={<Star className="h-4 w-4" />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <RecentGames initialGames={recentGames} />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <BalanceCard 
            balance={profile?.balance || 0} 
            calculatedBalance={transactions.reduce((total, transaction) => {
              if (transaction.type === 'deposit' || transaction.type === 'game_win') {
                return total + transaction.amount
              } else if (transaction.type === 'withdrawal' || transaction.type === 'game_bet') {
                return total - transaction.amount
              }
              return total
            }, 0)}
            userId={userId} 
            transactions={transactions}
          />
          <QuickActions />
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 text-foreground mb-4 font-heading">
              {fr.dashboard.onlinePlayers}
            </h3>
            <div className="text-center py-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold text-gray-900">{stats.activePlayersCount}</span>
              </div>
              <p className="text-gray-600">joueurs actifs dans les dernières 24h</p>
            </div>
          </div>
          
          {/* Player Stats Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 text-foreground mb-4 font-heading">
              Vos Statistiques
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Parties gagnées:</span>
                <span className="font-semibold text-gray-600">{stats.totalWins}/{stats.totalGames}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gains totaux:</span>
                <span className="font-semibold text-green-600">{stats.totalWinnings.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Misé total:</span>
                <span className="font-semibold text-gray-600">{stats.totalWagered.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Temps moyen/partie:</span>
                <span className="font-semibold text-gray-600">{stats.averageGameTime}min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Région:</span>
                <span className="font-semibold text-gray-600">{userRegion}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}