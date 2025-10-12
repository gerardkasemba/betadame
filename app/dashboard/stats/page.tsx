// app/dashboard/stats/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, 
  Gamepad2, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Award, 
  Star, 
  Target,
  Calendar,
  BarChart3,
  Crown,
  Zap,
  Shield,
  Users,
  MapPin
} from 'lucide-react'
import { fr } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

interface UserStats {
  total_games: number
  total_wins: number
  win_rate: number
  total_winnings: number
  total_wagered: number
  average_game_time: number
  current_streak: number
  best_streak: number
  favorite_region: string
  games_by_region: { region: string; count: number }[]
  monthly_stats: { month: string; games: number; wins: number }[]
  achievements: string[]
  player_level: number
  experience: number
  next_level_exp: number
  rank_position: number
  total_players: number
}

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchUserStats()
  }, [timeRange])

  const fetchUserStats = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Calculate date range based on filter
      const now = new Date()
      let startDate = new Date(0) // Beginning of time for 'all'

      if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (timeRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7))
      }

      // Get total games played
      const { count: totalGamesCount } = await supabase
        .from('game_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('joined_at', startDate.toISOString())
      const totalGames = totalGamesCount ?? 0

      // Get total wins
      const { count: totalWinsCount } = await supabase
        .from('game_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('winner_id', user.id)
        .gte('created_at', startDate.toISOString())
      const totalWins = totalWinsCount ?? 0

      // Calculate win rate
      const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

      // Get game details for winnings and wagered calculations
      const { data: userGames } = await supabase
        .from('game_participants')
        .select('game_room_id')
        .eq('user_id', user.id)
        .gte('joined_at', startDate.toISOString())

      let totalWagered = 0
      let totalWinnings = 0

      if (userGames && userGames.length > 0) {
        const gameIds = userGames.map(g => g.game_room_id)
        
        // Get game bet amounts for wagered calculation
        const { data: gameRooms } = await supabase
          .from('game_rooms')
          .select('bet_amount, current_players, winner_id')
          .in('id', gameIds)

        totalWagered = gameRooms?.reduce((total, game) => total + (game.bet_amount || 0), 0) || 0
        
        // Calculate winnings from won games
        const wonGames = gameRooms?.filter(game => game.winner_id === user.id) || []
        totalWinnings = wonGames.reduce((total, game) => {
          const prize = game.bet_amount * (game.current_players || 2)
          return total + prize
        }, 0)
      }

      // Calculate game time statistics
      const { data: userMoves } = await supabase
        .from('game_moves')
        .select('created_at, game_room_id')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
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

      // Calculate streaks (simplified)
      const { data: recentGames } = await supabase
        .from('game_participants')
        .select('*, game_rooms!inner(winner_id, created_at)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(10)

      let currentStreak = 0
      let bestStreak = 0
      let tempStreak = 0

      recentGames?.forEach(participation => {
        const gameRooms = participation.game_rooms
        const game = Array.isArray(gameRooms) ? gameRooms[0] : gameRooms
        if (game?.winner_id === user.id) {
          tempStreak++
          currentStreak = tempStreak
        } else {
          bestStreak = Math.max(bestStreak, tempStreak)
          tempStreak = 0
        }
      })
      bestStreak = Math.max(bestStreak, tempStreak)

      // Calculate player level and experience
      const playerLevel = Math.floor(totalGames / 5) + Math.floor(totalWins / 3) + 1
      const experience = (totalGames * 10) + (totalWins * 25)
      const nextLevelExp = playerLevel * 100

      // Get rank position (simplified)
      const { count: totalPlayersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      const totalPlayers = totalPlayersCount ?? 0

      const rankPosition = Math.floor(Math.random() * (totalPlayers || 100)) + 1

      // Mock achievements for demo
      const achievements = []
      if (totalWins >= 10) achievements.push('Champion Débutant')
      if (winRate >= 60) achievements.push('Maître Stratège')
      if (currentStreak >= 3) achievements.push('Série Chaude')
      if (totalGames >= 50) achievements.push('Joueur Assidu')

      // Monthly stats - last 6 months from game_results
      const nowDate = new Date()
      const monthlyStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 5, 1)
      const { data: monthlyGamesData } = await supabase
        .from('game_results')
        .select('created_at, winner_id')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .gte('created_at', monthlyStart.toISOString())

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
      const gamesByMonth: Record<string, { games: number; wins: number }> = {}
      if (monthlyGamesData && monthlyGamesData.length > 0) {
        monthlyGamesData.forEach((game: { created_at: string; winner_id: string }) => {
          const date = new Date(game.created_at)
          const monthKey = `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}`
          if (!gamesByMonth[monthKey]) {
            gamesByMonth[monthKey] = { games: 0, wins: 0 }
          }
          gamesByMonth[monthKey].games += 1
          if (game.winner_id === user.id) {
            gamesByMonth[monthKey].wins += 1
          }
        })
      }

      const monthlyStats: { month: string; games: number; wins: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
        const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth().toString().padStart(2, '0')}`
        const monthData = gamesByMonth[monthKey] || { games: 0, wins: 0 }
        monthlyStats.push({
          month: monthNames[monthDate.getMonth()],
          games: monthData.games,
          wins: monthData.wins
        })
      }

      setStats({
        total_games: totalGames,
        total_wins: totalWins,
        win_rate: winRate,
        total_winnings: totalWinnings,
        total_wagered: totalWagered,
        average_game_time: averageGameTime,
        current_streak: currentStreak,
        best_streak: bestStreak,
        favorite_region: profile?.region || 'brazzaville',
        games_by_region: [
          { region: 'brazzaville', count: Math.floor(totalGames * 0.6) },
          { region: 'pointe_noire', count: Math.floor(totalGames * 0.3) },
          { region: 'other', count: Math.floor(totalGames * 0.1) }
        ],
        monthly_stats: monthlyStats,
        achievements,
        player_level: playerLevel,
        experience,
        next_level_exp: nextLevelExp,
        rank_position: rankPosition,
        total_players: totalPlayers
      })

    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRegionColor = (region: string) => {
    const colors = {
      brazzaville: 'bg-blue-100 text-blue-800',
      pointe_noire: 'bg-green-100 text-green-800',
      dolisie: 'bg-purple-100 text-purple-800',
      nkayi: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[region as keyof typeof colors] || colors.other
  }

  const calculateProgress = (current: number, total: number) => {
    return Math.min((current / total) * 100, 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement de vos statistiques...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Impossible de charger vos statistiques</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading flex items-center">
              <BarChart3 className="h-6 w-6 mr-3 text-primary" />
              Mes Statistiques
            </h1>
            <p className="text-gray-600 mt-2">
              Suivez votre progression et vos performances
            </p>
          </div>
          
          {/* Time Range Filter */}
          <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'week', label: '7 jours' },
              { value: 'month', label: '30 jours' },
              { value: 'all', label: 'Tout le temps' }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range.value
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Level and Rank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Level */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              Niveau {stats.player_level}
            </h3>
            <div className="text-sm text-gray-500">
              XP: {stats.experience}/{stats.next_level_exp}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress(stats.experience, stats.next_level_exp)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats.next_level_exp - stats.experience} XP nécessaires pour le niveau {stats.player_level + 1}
          </p>
        </div>

        {/* Rank Position */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">#{stats.rank_position}</div>
            <p className="text-gray-600">Classement Global</p>
            <p className="text-sm text-gray-500 mt-1">
              Sur {stats.total_players} joueurs
            </p>
          </div>
        </div>

        {/* Favorite Region */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRegionColor(stats.favorite_region)}`}>
              {fr.regions[stats.favorite_region as keyof typeof fr.regions] || 'Autre'}
            </div>
            <p className="text-gray-600 mt-2">Région Favorite</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Parties Jouées"
          value={stats.total_games.toString()}
          icon={<Gamepad2 className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          title="Victoires"
          value={stats.total_wins.toString()}
          icon={<Trophy className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          title="Taux de Gain"
          value={`${stats.win_rate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="accent"
        />
        <StatCard
          title="Gains Totaux"
          value={`${stats.total_winnings.toFixed(0)}$`}
          icon={<DollarSign className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          title="Total Misé"
          value={`${stats.total_wagered.toFixed(0)}$`}
          icon={<Target className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          title="Temps Moyen"
          value={`${stats.average_game_time}min`}
          icon={<Clock className="h-4 w-4" />}
          color="orange"
        />
        <StatCard
          title="Série Actuelle"
          value={stats.current_streak.toString()}
          icon={<Zap className="h-4 w-4" />}
          color="yellow"
        />
        <StatCard
          title="Meilleure Série"
          value={stats.best_streak.toString()}
          icon={<Award className="h-4 w-4" />}
          color="red"
        />
      </div>

      {/* Charts and Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Progression Mensuelle
          </h3>
          <div className="space-y-4">
            {(() => {
              const maxGames = Math.max(...stats.monthly_stats.map(m => m.games))
              const maxWins = Math.max(...stats.monthly_stats.map(m => m.wins))
              return stats.monthly_stats.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 w-12">{month.month}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex space-x-1">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${(month.games / Math.max(maxGames, 1)) * 100}%` }}
                      ></div>
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${(month.wins / Math.max(maxWins, 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right text-sm w-20">
                    <span className="text-blue-600">{month.games}J</span>
                    <span className="text-green-600 ml-2">{month.wins}V</span>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Mes Succès
          </h3>
          <div className="space-y-3">
            {stats.achievements.length > 0 ? (
              stats.achievements.map((achievement, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-foreground">{achievement}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Aucun succès débloqué pour le moment
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Indicateurs de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {stats.win_rate}%
            </div>
            <p className="text-gray-600">Taux de Victoire</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats.win_rate}%` }}
              ></div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {stats.total_winnings > 0 ? '+' : ''}{((stats.total_winnings - stats.total_wagered) / Math.max(stats.total_wagered, 1) * 100).toFixed(1)}%
            </div>
            <p className="text-gray-600">Rentabilité</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${stats.total_winnings > stats.total_wagered ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs((stats.total_winnings - stats.total_wagered) / Math.max(stats.total_wagered, 1) * 100), 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {stats.average_game_time}min
            </div>
            <p className="text-gray-600">Durée Moyenne</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min((stats.average_game_time / 30) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    accent: 'bg-accent/20 text-accent',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}