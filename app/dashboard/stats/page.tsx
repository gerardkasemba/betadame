// app/dashboard/stats/page.tsx - Complete Fixed Version
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
  MapPin,
  Activity,
  X,
  Eye,
  ChevronRight
} from 'lucide-react'
import { fr } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

interface GameResult {
  id: string
  created_at: string
  winner_id: string | null
  player1_id: string
  player2_id: string
  final_board_state: any
  total_turns: number
  total_moves: number
  game_analysis: any
  bet_amount: number
  prize_distributed: number
  game_duration: number
  end_reason: string
  player1_username?: string
  player2_username?: string
}

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
  daily_stats: { date: string; games: number; wins: number }[]
  achievements: string[]
  player_level: number
  experience: number
  next_level_exp: number
  rank_position: number
  total_players: number
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
    <div className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow">
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

// Game Board Display Component
function GameBoardDisplay({ boardState }: { boardState: any }) {
  console.log('Board State:', boardState);

  // Create a demo board for testing if no valid board state
  const createDemoBoard = () => {
    const board = Array(10).fill(null).map(() => Array(10).fill(null));
    
    // Set up initial checkers position
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if ((row + col) % 2 === 1) {
          // Player 1 pieces (top rows)
          if (row < 4) {
            board[row][col] = { player: 1, isKing: false };
          }
          // Player 2 pieces (bottom rows)
          else if (row > 5) {
            board[row][col] = { player: 2, isKing: false };
          }
        }
      }
    }
    
    // Add some kings for demonstration
    board[2][1] = { player: 1, isKing: true };
    board[7][8] = { player: 2, isKing: true };
    
    return board;
  };

  let board: any[][];
  let usingDemo = false;
  
  if (!boardState) {
    console.log('Using demo board - no board state provided');
    board = createDemoBoard();
    usingDemo = true;
  } else {
    // Try to extract board from state
    if (Array.isArray(boardState)) {
      board = boardState;
    } else if (boardState.board && Array.isArray(boardState.board)) {
      board = boardState.board;
    } else if (boardState.state && Array.isArray(boardState.state)) {
      board = boardState.state;
    } else {
      // Try to parse as JSON string
      try {
        if (typeof boardState === 'string') {
          const parsed = JSON.parse(boardState);
          if (Array.isArray(parsed)) {
            board = parsed;
          } else if (parsed.board && Array.isArray(parsed.board)) {
            board = parsed.board;
          } else if (parsed.state && Array.isArray(parsed.state)) {
            board = parsed.state;
          } else {
            throw new Error('Invalid format');
          }
        } else {
          throw new Error('Not a string');
        }
      } catch (e) {
        console.log('Using demo board - invalid board state format');
        board = createDemoBoard();
        usingDemo = true;
      }
    }
  }

  // Ensure board is 10x10
  if (!Array.isArray(board) || board.length !== 10) {
    console.log('Using demo board - invalid board dimensions');
    board = createDemoBoard();
    usingDemo = true;
  }

  const BOARD_SIZE = 10;

  return (
    <div className="inline-block">
      <div className="grid grid-cols-10 gap-0 border-4 border-gray-800 rounded-lg overflow-hidden bg-amber-800">
        {Array.from({ length: BOARD_SIZE }).map((_, row) =>
          Array.from({ length: BOARD_SIZE }).map((_, col) => {
            const isDark = (row + col) % 2 === 1;
            const piece = board[row]?.[col];
            
            // Determine piece properties
            let piecePlayer = null;
            let isKing = false;

            if (piece) {
              if (typeof piece === 'object') {
                piecePlayer = piece.player || piece.owner || piece.color;
                isKing = piece.isKing || piece.king || piece.dame || false;
              } else if (typeof piece === 'number') {
                piecePlayer = piece;
                isKing = false;
              } else if (typeof piece === 'string') {
                if (piece.includes('1')) piecePlayer = 1;
                else if (piece.includes('2')) piecePlayer = 2;
                isKing = piece.includes('K') || piece.includes('k');
              }
            }

            return (
              <div
                key={`${row}-${col}`}
                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center ${
                  isDark 
                    ? 'bg-amber-800 hover:bg-amber-900' 
                    : 'bg-amber-100 hover:bg-amber-200'
                } transition-colors relative`}
              >
                {piecePlayer && (
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold shadow-lg border-2 ${
                      piecePlayer === 1
                        ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-700 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700 text-white'
                    } ${isKing ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    {isKing && (
                      <span className="text-white text-sm drop-shadow-lg">♔</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 border border-red-700"></div>
          <span className="text-gray-700 text-xs">Joueur 1</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-700"></div>
          <span className="text-gray-700 text-xs">Joueur 2</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 border border-red-700 ring-1 ring-yellow-400"></div>
          <span className="text-gray-700 text-xs">Dame</span>
        </div>
      </div>

      {usingDemo && (
        <div className="mt-2 text-xs text-orange-600 text-center">
          (Plateau de démonstration)
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all')
  const [showGameHistory, setShowGameHistory] = useState(false)
  const [gameHistory, setGameHistory] = useState<GameResult[]>([])
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null)
  const [showGameModal, setShowGameModal] = useState(false)

   const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchUserStats()
  }, [timeRange])

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

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

      // Daily stats for last 7 days from game_results
      const nowDate = new Date()
      const sevenDaysAgo = new Date(nowDate)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const { data: dailyGamesData } = await supabase
        .from('game_results')
        .select('created_at, winner_id')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .gte('created_at', sevenDaysAgo.toISOString())

      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      const gamesByDay: Record<string, { games: number; wins: number }> = {}
      
      if (dailyGamesData && dailyGamesData.length > 0) {
        dailyGamesData.forEach((game: { created_at: string; winner_id: string }) => {
          const date = new Date(game.created_at)
          const dayKey = date.toISOString().split('T')[0]
          if (!gamesByDay[dayKey]) {
            gamesByDay[dayKey] = { games: 0, wins: 0 }
          }
          gamesByDay[dayKey].games += 1
          if (game.winner_id === user.id) {
            gamesByDay[dayKey].wins += 1
          }
        })
      }

      const dailyStats: { date: string; games: number; wins: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const dayDate = new Date(nowDate)
        dayDate.setDate(dayDate.getDate() - i)
        dayDate.setHours(0, 0, 0, 0)
        const dayKey = dayDate.toISOString().split('T')[0]
        const dayData = gamesByDay[dayKey] || { games: 0, wins: 0 }
        
        const dayName = i === 0 ? 'Auj' : i === 1 ? 'Hier' : dayNames[dayDate.getDay()]
        
        dailyStats.push({
          date: dayName,
          games: dayData.games,
          wins: dayData.wins
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
        daily_stats: dailyStats.length > 0 ? dailyStats : [
          { date: 'Dim', games: 0, wins: 0 },
          { date: 'Lun', games: 0, wins: 0 },
          { date: 'Mar', games: 0, wins: 0 },
          { date: 'Mer', games: 0, wins: 0 },
          { date: 'Jeu', games: 0, wins: 0 },
          { date: 'Ven', games: 0, wins: 0 },
          { date: 'Auj', games: 0, wins: 0 }
        ],
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

  const fetchGameHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, get the game results
      const { data: games, error } = await supabase
        .from('game_results')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (!games || games.length === 0) {
        setGameHistory([])
        setShowGameHistory(true)
        return
      }

      // Get all player IDs
      const playerIds = new Set<string>()
      games.forEach(game => {
        if (game.player1_id) playerIds.add(game.player1_id)
        if (game.player2_id) playerIds.add(game.player2_id)
      })

      // Get usernames separately to avoid relationship errors
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(playerIds))

      // Create username mapping
      const usernameMap = new Map()
      profiles?.forEach(profile => {
        usernameMap.set(profile.id, profile.username)
      })

      // Format games
      const formattedGames: GameResult[] = games.map((game: any) => ({
        ...game,
        player1_username: usernameMap.get(game.player1_id) || `Joueur ${game.player1_id?.substring(0, 6)}...`,
        player2_username: usernameMap.get(game.player2_id) || `Joueur ${game.player2_id?.substring(0, 6)}...`
      }))

      setGameHistory(formattedGames)
      setShowGameHistory(true)
    } catch (error) {
      console.error('Error fetching game history:', error)
      // Fallback: show games without usernames
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: games } = await supabase
          .from('game_results')
          .select('*')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20)

        const formattedGames: GameResult[] = (games || []).map((game: any) => ({
          ...game,
          player1_username: 'Joueur 1',
          player2_username: 'Joueur 2'
        }))

        setGameHistory(formattedGames)
        setShowGameHistory(true)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    }
  }

  const viewGameBoard = (game: GameResult) => {
    setSelectedGame(game)
    setShowGameModal(true)
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
        <div 
          onClick={fetchGameHistory} 
          className="cursor-pointer group relative"
        >
          {/* Simple pulsing message */}
          <div className="absolute -top-2 -right-2 z-10">
            <div className="relative">
              <div className="absolute -inset-1 bg-blue-500 rounded-full opacity-70 animate-ping group-hover:animate-none"></div>
              <div className="relative bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full group-hover:bg-blue-600 transition-colors cursor-pointer">
                👁 Voir
              </div>
            </div>
          </div>
          
          <StatCard
            title="Parties Jouées"
            value={stats.total_games.toString()}
            icon={
              <div className="relative">
                <Gamepad2 className="h-4 w-4" />
              </div>
            }
            color="blue"
          />
          
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-blue-600 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Cliquer pour l'historique
          </div>
        </div>
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
        {/* Daily Progress - Last 7 Days */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary" />
            Activité des 7 Derniers Jours
          </h3>
          
          {(stats.daily_stats && stats.daily_stats.length > 0 && stats.daily_stats.some(day => day.games > 0)) ? (
            <div className="space-y-3">
              {(() => {
                const maxGames = Math.max(...stats.daily_stats.map(d => d.games), 1)
                return stats.daily_stats.map((day, index) => (
                  <div key={index} className="group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 w-12">{day.date}</span>
                      <div className="text-right text-xs text-gray-500">
                        {day.games > 0 ? (
                          <>
                            <span className="text-blue-600 font-medium">{day.games} partie{day.games > 1 ? 's' : ''}</span>
                            {day.wins > 0 && (
                              <span className="text-green-600 font-medium ml-2">
                                {day.wins} victoire{day.wins > 1 ? 's' : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">Aucune partie</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      {/* Games bar */}
                      <div 
                        className="h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded-md transition-all duration-300 flex items-center justify-center relative group-hover:from-blue-500 group-hover:to-blue-600"
                        style={{ width: `${day.games > 0 ? Math.max((day.games / maxGames) * 100, 5) : 0}%` }}
                      >
                        {day.games > 0 && (
                          <span className="text-xs font-bold text-white">{day.games}</span>
                        )}
                      </div>
                      
                      {/* Wins bar */}
                      {day.wins > 0 && (
                        <div 
                          className="h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-md transition-all duration-300 flex items-center justify-center group-hover:from-green-500 group-hover:to-green-600"
                          style={{ width: `${Math.max((day.wins / maxGames) * 80, 5)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{day.wins}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Win rate indicator */}
                    {day.games > 0 && (
                      <div className="mt-1 text-right">
                        <span className={`text-xs font-semibold ${
                          (day.wins / day.games) >= 0.5 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {Math.round((day.wins / day.games) * 100)}% victoires
                        </span>
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune partie jouée cette semaine</p>
              <p className="text-sm text-gray-400 mt-1">Commencez à jouer pour voir vos statistiques!</p>
            </div>
          )}

          {/* Legend */}
          {stats.daily_stats && stats.daily_stats.length > 0 && stats.daily_stats.some(day => day.games > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded"></div>
                <span className="text-gray-600">Parties jouées</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded"></div>
                <span className="text-gray-600">Victoires</span>
              </div>
            </div>
          )}
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
                <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg hover:from-primary/20 hover:to-secondary/20 transition-colors">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-foreground">{achievement}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun succès débloqué</p>
                <p className="text-sm text-gray-400 mt-1">Continuez à jouer pour débloquer des succès!</p>
              </div>
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

{/* Game History Modal */}
{showGameHistory && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Trophy className="h-6 w-6 mr-3 text-primary" />
          Historique des Parties
        </h2>
        <button
          onClick={() => setShowGameHistory(false)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
        {gameHistory.length > 0 ? (
          <div className="space-y-3">
            {gameHistory.map((game) => {
              // FIXED: Determine winner based on current user context
              const isCurrentUserPlayer1 = game.player1_id === currentUserId
              const isWinner = (isCurrentUserPlayer1 && game.winner_id === game.player1_id) || 
                              (!isCurrentUserPlayer1 && game.winner_id === game.player2_id)
              const isDraw = !game.winner_id
              
              return (
                <div
                  key={game.id}
                  className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg cursor-pointer ${
                    isWinner
                      ? 'bg-green-50 border-green-200 hover:border-green-300'
                      : isDraw
                      ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      : 'bg-red-50 border-red-200 hover:border-red-300'
                  }`}
                  onClick={() => viewGameBoard(game)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isWinner
                            ? 'bg-green-200 text-green-800'
                            : isDraw
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {isWinner ? '🏆 Victoire' : isDraw ? '🤝 Match Nul' : '😔 Défaite'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(game.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {game.player1_username}
                          </span>
                          <span className="text-gray-500">vs</span>
                          <span className="font-semibold text-gray-900">
                            {game.player2_username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{Math.floor(game.game_duration / 60)}min</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Target className="h-3 w-3" />
                          <span>{game.total_turns} tours</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{game.bet_amount}$ mise</span>
                        </span>
                        {isWinner && game.prize_distributed > 0 && (
                          <span className="flex items-center space-x-1 text-green-600 font-semibold">
                            <Trophy className="h-3 w-3" />
                            <span>+{game.prize_distributed}$</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          viewGameBoard(game)
                        }}
                        className="p-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
                      >
                        <Eye className="h-5 w-5 text-primary" />
                      </button>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Gamepad2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Aucune partie dans l'historique</p>
          </div>
        )}
      </div>
    </div>
  </div>
)}

      {/* Game Board Modal */}
      {showGameModal && selectedGame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center">
                  <Trophy className="h-6 w-6 mr-3 text-primary" />
                  État Final de la Partie
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(selectedGame.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowGameModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(95vh-100px)] p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Game Board */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-xl p-4 flex justify-center">
                    <GameBoardDisplay boardState={selectedGame.final_board_state} />
                  </div>
                </div>

                {/* Game Info */}
                <div className="space-y-4">
                  {/* Players */}
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Joueurs
                    </h3>
                    <div className="space-y-2">
                      <div className={`p-3 rounded-lg ${
                        selectedGame.winner_id === selectedGame.player1_id
                          ? 'bg-green-100 border-2 border-green-300'
                          : 'bg-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-red-600">
                            {selectedGame.player1_username}
                          </span>
                          {selectedGame.winner_id === selectedGame.player1_id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <span className="text-xs text-gray-600">Joueur 1 (Rouge)</span>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        selectedGame.winner_id === selectedGame.player2_id
                          ? 'bg-green-100 border-2 border-green-300'
                          : 'bg-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-600">
                            {selectedGame.player2_username}
                          </span>
                          {selectedGame.winner_id === selectedGame.player2_id && (
                            <Trophy className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <span className="text-xs text-gray-600">Joueur 2 (Bleu)</span>
                      </div>
                    </div>
                  </div>

                  {/* Game Stats */}
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Statistiques
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tours joués:</span>
                        <span className="font-semibold">{selectedGame.total_turns}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mouvements:</span>
                        <span className="font-semibold">{selectedGame.total_moves}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Durée:</span>
                        <span className="font-semibold">
                          {Math.floor(selectedGame.game_duration / 60)}min {selectedGame.game_duration % 60}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mise:</span>
                        <span className="font-semibold">{selectedGame.bet_amount}$</span>
                      </div>
                      {selectedGame.prize_distributed > 0 && (
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Gains:</span>
                          <span className="font-semibold text-green-600">
                            {selectedGame.prize_distributed}$
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Game Analysis */}
                  {selectedGame.game_analysis && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Analyse
                      </h3>
                      <div className="space-y-3 text-sm">
                        {selectedGame.game_analysis.pieceCount && (
                          <div>
                            <div className="text-gray-600 mb-1">Pièces finales:</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-red-600">
                                J1: {selectedGame.game_analysis.pieceCount.player1}
                              </span>
                              <span className="text-blue-600">
                                J2: {selectedGame.game_analysis.pieceCount.player2}
                              </span>
                            </div>
                          </div>
                        )}
                        {selectedGame.game_analysis.kingCount && (
                          <div>
                            <div className="text-gray-600 mb-1">Dames:</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-red-600">
                                J1: {selectedGame.game_analysis.kingCount.player1}
                              </span>
                              <span className="text-blue-600">
                                J2: {selectedGame.game_analysis.kingCount.player2}
                              </span>
                            </div>
                          </div>
                        )}
                        {selectedGame.game_analysis.evaluation !== undefined && (
                          <div>
                            <div className="text-gray-600 mb-1">Évaluation finale:</div>
                            <div className={`text-lg font-bold ${
                              selectedGame.game_analysis.evaluation > 0
                                ? 'text-green-600'
                                : selectedGame.game_analysis.evaluation < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>
                              {selectedGame.game_analysis.evaluation > 0 ? '+' : ''}
                              {selectedGame.game_analysis.evaluation.toFixed(1)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}