// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import QuickStats from '@/components/quick-stats'
import RecentGames from '@/components/recent-games'
import BalanceCard from '@/components/balance-card'
import QuickActions from '@/components/quick-actions'
import { Gamepad2, TrendingUp, Users, Trophy, DollarSign, Clock, Award, Star, RefreshCw } from 'lucide-react'
import { fr } from '@/lib/i18n'
import { DashboardData } from '@/types/game'

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userRegion, setUserRegion] = useState<string>('Congo')
  const [userId, setUserId] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData()
    setupRealTimeSubscriptions()
  }, [])

  // Get user's region from browser
  useEffect(() => {
    detectUserRegion()
  }, [])

  const detectUserRegion = async () => {
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
  }

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
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
          .limit(5),

        supabase
          .from('transactions')
          .select('amount, type, status, created_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
      ])

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

      // Fetch recent games data
      const userGameIds = userGameParticipations.map(p => p.game_room_id)
      const { data: recentGamesData } = userGameIds.length > 0 ? await supabase
        .from('game_rooms')
        .select('*')
        .in('id', userGameIds)
        .order('created_at', { ascending: false }) : { data: [] }

      // Fetch creator profiles
      const creatorIds = recentGamesData?.map(game => game.created_by).filter(Boolean) || []
      const { data: creatorProfiles } = creatorIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, username, state')
        .in('id', creatorIds) : { data: [] }

      // Format recent games
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
          created_at: game.created_at,
          profiles: creator ? { username: creator.username } : undefined
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

      setDashboardData({
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
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const setupRealTimeSubscriptions = () => {
    const channel = supabase.channel('dashboard-updates')
    
    // Profile changes (balance updates)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      },
      (payload) => {
        console.log('Profile updated:', payload)
        fetchDashboardData() // Refresh data
      }
    )

    // Game participant changes (new games, game updates)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_participants'
      },
      (payload) => {
        console.log('Game participation updated:', payload)
        fetchDashboardData()
      }
    )

    // Game room changes (game status, winners)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms'
      },
      (payload) => {
        console.log('Game room updated:', payload)
        fetchDashboardData()
      }
    )

    // Transaction changes (deposits, withdrawals, game bets/wins)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions'
      },
      (payload) => {
        console.log('Transaction updated:', payload)
        fetchDashboardData()
      }
    )

    // Game moves changes (for average game time calculation)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_moves'
      },
      (payload) => {
        console.log('Game move updated:', payload)
        fetchDashboardData()
      }
    )

    channel.subscribe((status) => {
      console.log('Real-time subscription status:', status)
    })

    return () => {
      channel.unsubscribe()
    }
  }

  const refreshData = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erreur lors du chargement des données</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 bg-primary text-white px-4 py-2 rounded-lg"
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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold mb-2 font-heading">
                {fr.common.welcome}, {profile?.username || 'Joueur'}!
              </h1>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                title="Actualiser les données"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-blue-100">
              Niveau {stats.playerLevel} • {profile?.state} • 
              Membre depuis {new Date(profile?.created_at || Date.now()).toLocaleDateString('fr-FR')}
            </p>
            {refreshing && (
              <p className="text-blue-200 text-sm mt-2">Actualisation en cours...</p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 justify-end">
              <Star className="h-6 w-6 text-accent" />
              <span className="text-2xl font-bold">{stats.playerLevel}</span>
            </div>
            <p className="text-sm text-blue-200">Votre niveau</p>
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
          {/* FIXED: Pass userId instead of profile.id */}
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
          <RecentGames games={recentGames} />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
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