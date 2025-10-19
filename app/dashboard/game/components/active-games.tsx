// app/dashboard/game/components/active-games.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react' // Add this import
import { createClient } from '@/lib/supabase/client'
import { 
  Play, 
  Users, 
  Clock, 
  Trophy, 
  DollarSign, 
  AlertCircle, 
  Crown,  
  Zap,
  Search,
  TrendingUp,
  Shield,
  Sparkles,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { TbPlayCardStar } from "react-icons/tb";
import { PiCheckerboardFill } from "react-icons/pi";

interface ActiveGame {
  id: string
  name: string
  bet_amount: number
  status: string
  current_players: number
  max_players: number
  region: string | null
  created_at: string
  estimated_duration?: number
  time_per_turn?: number
  game_type?: string
  participants?: Array<{
    user_id: string
    player_number: number
  }>
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

interface GameTypeConfig {
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: ReactNode // Changed from JSX.Element to ReactNode
  name: string
  description: string
  badge: string | ReactNode // Changed from JSX.Element to ReactNode
}

export default function ActiveGames() {
  const [games, setGames] = useState<ActiveGame[]>([])
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing'>('all')
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all')
  const [joiningGame, setJoiningGame] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(9)
  const supabase = createClient()

  const pageSizes = [6, 9, 12, 18]

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Toast system
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }, [])

  // Load current user
  const loadCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }, [supabase.auth])

  // Load active games
  const loadActiveGames = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('game_rooms')
        .select(`
          *,
          participants:game_participants(user_id, player_number)
        `)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      if (gameTypeFilter !== 'all') {
        if (gameTypeFilter === 'checkers') {
          query = query.in('game_type', ['checkers', 'checkers_ranked'])
        } else if (gameTypeFilter === 'cards') {
          query = query.eq('game_type', 'inter_demande')
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading games:', error)
        showToast('Erreur lors du chargement des parties', 'error')
        return
      }

      if (data) {
        setGames(data)
      }
    } catch (error) {
      console.error('Error loading games:', error)
      showToast('Erreur lors du chargement des parties', 'error')
    } finally {
      setLoading(false)
    }
  }, [filter, gameTypeFilter, showToast, supabase])

  useEffect(() => {
    loadCurrentUser()
    loadActiveGames()
    
    const subscription = supabase
      .channel('game_rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => loadActiveGames()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadActiveGames, loadCurrentUser, supabase])

  // Check if current user is in a game
  const isUserInGame = useCallback((game: ActiveGame): boolean => {
    if (!currentUserId || !game.participants) return false
    return game.participants.some(participant => participant.user_id === currentUserId)
  }, [currentUserId])

  // Get user's role in game
  const getUserRoleInGame = useCallback((game: ActiveGame): string => {
    if (!currentUserId || !game.participants) return ''
    const participant = game.participants.find(p => p.user_id === currentUserId)
    return participant ? `Joueur ${participant.player_number}` : ''
  }, [currentUserId])

  // Filter games to only show games the user is in OR waiting games with available spots
  const getVisibleGames = useCallback((games: ActiveGame[]): ActiveGame[] => {
    return games.filter(game => {
      // Always show games the user is already in
      if (isUserInGame(game)) return true
      
      // For waiting games, show if there are available spots
      if (game.status === 'waiting' && game.current_players < game.max_players) return true
      
      // Don't show playing games that the user isn't in
      return false
    })
  }, [isUserInGame])

  const getGameTypeConfig = useCallback((gameType?: string): GameTypeConfig => {
    switch (gameType) {
      case 'checkers_ranked':
        return {
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          borderColor: 'border-gray-200',
          textColor: 'text-blue-800',
          icon: <PiCheckerboardFill className="h-5 w-5" />,
          name: 'Dames Classées',
          description: 'Partie classée - Affecte votre rang',
          badge: '🏆 Classé'
        }
      case 'checkers':
        return {
          color: 'from-blue-500 to-blue-600',
          bgColor: 'bg-gradient-to-br from-blue-50 to-blue-50',
          borderColor: 'border-gray-200',
          textColor: 'text-blue-800',
          icon: <PiCheckerboardFill className="h-5 w-5" />,
          name: 'Dames Rapides',
          description: 'Partie rapide - Jeu classique',
          badge: '⚡ Rapide'
        }
      case 'inter_demande':
        return {
          color: 'from-yellow-500 to-yellow-600',
          bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-50',
          borderColor: 'border-gray-200',
          textColor: 'text-yellow-800',
          icon: <TbPlayCardStar className="h-5 w-5" />,
          name: 'Jeux d\'Inter',
          description: 'Cartes spéciales - Défis dynamiques',
          badge:  <TbPlayCardStar className="h-5 w-5" />
        }
      default:
        return {
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          icon: <PiCheckerboardFill className="h-5 w-5" />,
          name: 'Dames Rapides',
          description: 'Partie classique',
          badge: '🎮 Jeu'
        }
    }
  }, [])

  const getGameTypeText = useCallback((gameType?: string) => {
    switch (gameType) {
      case 'checkers_ranked': return 'Dames Classées'
      case 'checkers': return 'Dames Rapides'
      case 'inter_demande': return 'Jeux d\'Inter'
      default: return 'Dames Rapides'
    }
  }, [])

  // Get relative time for game creation
  const getTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays === 1) return 'Hier'
    return `Il y a ${diffDays}j`
  }, [])

  // Filter games based on search term AND visibility rules
  const filteredGames = useMemo(() => 
    getVisibleGames(games).filter(game => 
      game.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      getGameTypeText(game.game_type).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [games, debouncedSearchTerm, getVisibleGames, getGameTypeText]
  )

  // Enhanced error handling for game joining
  const handleJoinError = useCallback((error: any) => {
    console.error('Join game error:', error)
    
    if (error.code === '23505') {
      showToast('Vous êtes déjà dans cette partie', 'warning')
    } else if (error.code === '40001') {
      showToast('Conflit détecté, veuillez rafraîchir la page', 'warning')
    } else if (error.message?.includes('balance')) {
      showToast('Erreur de traitement du solde', 'error')
    } else {
      showToast('Erreur lors de la connexion à la partie', 'error')
    }
  }, [showToast])

  const joinGameFallback = async (gameId: string) => {
    try {
      setJoiningGame(gameId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showToast('Vous devez être connecté pour rejoindre une partie', 'error')
        return
      }

      const game = games.find(g => g.id === gameId)
      if (!game) {
        showToast('Partie non trouvée', 'error')
        return
      }

      // Check if user is already in the game
      if (isUserInGame(game)) {
        const gamePath = game.game_type === 'inter_demande' 
          ? `/dashboard/game/inter/${gameId}`
          : `/dashboard/game/p/${gameId}`
        window.location.href = gamePath
        return
      }

      // Check user balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single()

      if (!profile) {
        showToast('Profil utilisateur non trouvé', 'error')
        return
      }

      if (profile.balance < game.bet_amount) {
        showToast(`Solde insuffisant. Vous avez ${profile.balance}$ mais la mise est de ${game.bet_amount}$. Veuillez recharger votre compte.`, 'error')
        return
      }

      // Check if game is still available
      const { data: currentGame } = await supabase
        .from('game_rooms')
        .select('current_players, max_players, status')
        .eq('id', gameId)
        .single()

      if (!currentGame || currentGame.status !== 'waiting' || currentGame.current_players >= currentGame.max_players) {
        showToast('Cette partie n\'est plus disponible pour rejoindre', 'warning')
        await loadActiveGames()
        return
      }

      // Get existing participants
      const { data: existingParticipants } = await supabase
        .from('game_participants')
        .select('player_number')
        .eq('game_room_id', gameId)

      const usedPlayerNumbers = existingParticipants?.map(p => p.player_number) || []
      let playerNumber: number;
      
      if (usedPlayerNumbers.includes(1) && !usedPlayerNumbers.includes(2)) {
        playerNumber = 2;
      } else if (usedPlayerNumbers.includes(2) && !usedPlayerNumbers.includes(1)) {
        playerNumber = 1;
      } else {
        playerNumber = usedPlayerNumbers.length + 1;
      }

      // Start transaction - deduct balance
      const { error: balanceError } = await supabase.rpc('decrement_balance', {
        user_id: user.id,
        amount: game.bet_amount
      })

      if (balanceError) {
        console.error('Balance update error:', balanceError)
        handleJoinError(balanceError)
        return
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'game_bet',
          amount: game.bet_amount,
          status: 'completed',
          reference: `GAME-BET-${gameId}`
        })

      if (transactionError) {
        console.error('Transaction error:', transactionError)
        // Rollback balance deduction
        await supabase.rpc('increment_balance', {
          user_id: user.id,
          amount: game.bet_amount
        })
        handleJoinError(transactionError)
        return
      }

      // Join game
      const { error: joinError } = await supabase
        .from('game_participants')
        .insert({
          game_room_id: gameId,
          user_id: user.id,
          player_number: playerNumber,
          is_ready: true
        })

      if (joinError) {
        console.error('Join error:', joinError)
        // Rollback balance and transaction
        await supabase.rpc('increment_balance', {
          user_id: user.id,
          amount: game.bet_amount
        })
        await supabase
          .from('transactions')
          .delete()
          .eq('reference', `GAME-BET-${gameId}`)
        handleJoinError(joinError)
        return
      }

      // Update game room
      const newPlayerCount = currentGame.current_players + 1
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          current_players: newPlayerCount,
          status: newPlayerCount >= game.max_players ? 'playing' : 'waiting',
          current_player: newPlayerCount >= game.max_players ? 1 : currentGame.current_players
        })
        .eq('id', gameId)

      if (updateError) {
        console.error('Update error:', updateError)
        showToast('Erreur lors de la mise à jour de la partie', 'error')
        return
      }

      showToast(`Vous avez rejoint la partie en tant que Joueur ${playerNumber} avec une mise de ${game.bet_amount}$. Le gagnant remportera ${getTotalPrize(game)}$!`, 'success')
      
      setTimeout(() => {
        const gamePath = game.game_type === 'inter_demande' 
          ? `/dashboard/game/inter/${gameId}`
          : `/dashboard/game/p/${gameId}`
        window.location.href = gamePath
      }, 1500)

    } catch (error) {
      console.error('Error joining game:', error)
      handleJoinError(error)
    } finally {
      setJoiningGame(null)
    }
  }

  const getTotalPrize = useCallback((game: ActiveGame) => {
    return game.bet_amount * game.max_players
  }, [])

  const getStatusColor = useCallback((status: string) => {
    return status === 'playing' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-amber-100 text-amber-800 border-amber-200'
  }, [])

  const getStatusIcon = useCallback((status: string) => {
    return status === 'playing' 
      ? <Zap className="h-3 w-3 mr-1" />
      : <Clock className="h-3 w-3 mr-1" />
  }, [])

  // Get appropriate button text and action
  const getGameActionButton = useCallback((game: ActiveGame) => {
    const userInGame = isUserInGame(game)
    const userRole = getUserRoleInGame(game)

    if (userInGame) {
      // User is already in this game - show Resume button
      return {
        text: `Reprendre - ${userRole}`,
        icon: <RotateCcw className="h-4 w-4 mr-2" />,
        onClick: () => {
          const gamePath = game.game_type === 'inter_demande' 
            ? `/dashboard/game/inter/${game.id}`
            : `/dashboard/game/p/${game.id}`
          window.location.href = gamePath
        },
        className: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
        disabled: false
      }
    } else if (game.status === 'waiting' && game.current_players < game.max_players) {
      // User can join this waiting game
      return {
        text: `Rejoindre - ${game.bet_amount}$`,
        icon: <Play className="h-4 w-4 mr-2" />,
        onClick: () => joinGameFallback(game.id),
        className: `bg-gradient-to-r ${getGameTypeConfig(game.game_type).color} hover:shadow-lg`,
        disabled: joiningGame === game.id
      }
    } else {
      // Game is full or playing and user is not in it - don't show button (game should be filtered out)
      return null
    }
  }, [isUserInGame, getUserRoleInGame, getGameTypeConfig, joiningGame])

  // Pagination
  const totalPages = Math.ceil(filteredGames.length / pageSize)
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Get empty state message based on current filters
  const getEmptyStateMessage = useCallback(() => {
    if (searchTerm) return 'Aucune partie ne correspond à votre recherche'
    if (filter === 'waiting') return 'Aucune partie en attente disponible'
    if (filter === 'playing') return 'Aucune de vos parties en cours'
    if (gameTypeFilter !== 'all') return `Aucune partie de ce type disponible`
    return 'Aucune partie active'
  }, [searchTerm, filter, gameTypeFilter])

  // Skeleton loading component
  const GameCardSkeleton = () => (
    <div className="animate-pulse rounded-2xl border-2 border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-xl"></div>
          <div>
            <div className="h-5 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-300 rounded-full w-20"></div>
              <div className="h-6 bg-gray-300 rounded-full w-16"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 bg-gray-200 rounded-xl mb-4"></div>
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-2 bg-gray-200 rounded-full w-full"></div>
      </div>
      <div className="h-12 bg-gray-300 rounded-xl"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border-l-4 backdrop-blur-sm max-w-sm ${
              toast.type === 'success' 
                ? 'bg-green-50/95 border-green-500 text-green-800'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-500 text-amber-800'
                : 'bg-red-50/95 border-red-500 text-red-800'
            }`}
          >
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" />
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
        {/* Header */}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Mes parties</p>
                <p className="text-2xl font-bold text-blue-900">
                  {games.filter(g => isUserInGame(g)).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Disponibles</p>
                <p className="text-2xl font-bold text-amber-900">
                  {games.filter(g => g.status === 'waiting' && g.current_players < g.max_players).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">En cours</p>
                <p className="text-2xl font-bold text-red-900">
                  {games.filter(g => g.status === 'playing' && isUserInGame(g)).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-2xl p-6 mb-8 border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une partie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full sm:w-64 rounded-xl border border-gray-200 focus:ring-1  focus:border-blue-500 bg-white"
                  aria-label="Rechercher une partie"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-3 rounded-xl transition-all font-medium ${
                    filter === 'all' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                  }`}
                  aria-label="Afficher toutes les parties"
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('waiting')}
                  className={`px-4 py-3 rounded-xl transition-all font-medium ${
                    filter === 'waiting' 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-300'
                  }`}
                  aria-label="Afficher les parties en attente"
                >
                  En attente
                </button>
                <button
                  onClick={() => setFilter('playing')}
                  className={`px-4 py-3 rounded-xl transition-all font-medium ${
                    filter === 'playing' 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
                  }`}
                  aria-label="Afficher les parties en cours"
                >
                  En cours
                </button>
              </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
              {/* Game Type Filter */}
              <select 
                value={gameTypeFilter}
                onChange={(e) => setGameTypeFilter(e.target.value)}
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-1  focus:border-blue-500 font-medium"
                aria-label="Filtrer par type de jeu"
              >
                <option value="all">🎮 Tous les jeux</option>
                <option value="checkers">♟️ Jeux de Dames</option>
                <option value="cards">🎴 Jeux d'Inter</option>
              </select>

              {/* Page Size Selector */}
              <select 
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-1  focus:border-blue-500 font-medium"
                aria-label="Nombre de parties par page"
              >
                {pageSizes.map(size => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: pageSize }).map((_, index) => (
              <GameCardSkeleton key={index} />
            ))}
          </div>
        ) : paginatedGames.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
              <Trophy className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {getEmptyStateMessage()}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? 'Essayez de modifier vos termes de recherche ou vos filtres.' 
                : 'Revenez plus tard ou créez une nouvelle partie pour commencer à jouer.'
              }
            </p>
            <button 
              onClick={() => window.location.href = '/dashboard/game'}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 font-semibold"
            >
              Créer une nouvelle partie
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {paginatedGames.map(game => {
                const config = getGameTypeConfig(game.game_type)
                const userInGame = isUserInGame(game)
                const userRole = getUserRoleInGame(game)
                const actionButton = getGameActionButton(game)
                
                return (
                  <div 
                    key={game.id} 
                    className={`rounded-2xl border-2 ${config.borderColor} bg-white p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group ${
                      userInGame ? ' ring-opacity-50' : ''
                    }`}
                  >
                    {/* Game Header */}
                    <div className="space-y-3 mb-4">
                      {/* Top Row - Icon, Name, and Time */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Left - Icon and Name */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Game Icon */}
                          <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-r ${config.color} text-white shadow-lg flex-shrink-0`}>
                            <div className="w-5 h-5 sm:w-6 sm:h-6">
                              {config.icon}
                            </div>
                          </div>
                          
                          {/* Game Name */}
                          <div className="flex-1 min-w-0 pt-1">
                            <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight group-hover:text-gray-800 truncate">
                              {game.name}
                            </h3>
                          </div>
                        </div>
                        
                        {/* Right - Time Badge */}
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                          {getTimeAgo(game.created_at)}
                        </div>
                      </div>
                      
                      {/* Bottom Row - Status Badges (Scrollable on mobile) */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(game.status)} border whitespace-nowrap flex-shrink-0`}>
                          <span className="w-3 h-3 flex-shrink-0">
                            {getStatusIcon(game.status)}
                          </span>
                          <span>{game.status === 'playing' ? 'En cours' : 'En attente'}</span>
                        </span>
                        
                        {/* Game Type Badge */}
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.textColor} bg-white/80 border ${config.borderColor} whitespace-nowrap flex-shrink-0`}>
                          {config.badge}
                        </span>
                        
                        {/* User Role Badge (if applicable) */}
                        {userInGame && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 whitespace-nowrap flex-shrink-0">
                            {userRole}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prize Pool - Highlighted */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">💰 Jackpot</p>
                          <p className="text-xs text-amber-700">Total à gagner</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-900 flex items-center">
                            <DollarSign className="h-5 w-5 mr-1" />
                            {getTotalPrize(game)}
                          </p>
                          <p className="text-xs text-amber-700">
                            {game.max_players} × {game.bet_amount}$
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Game Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Mise par joueur:</span>
                        <span className="font-semibold text-gray-900 flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {game.bet_amount}$
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Joueurs:</span>
                        <span className="font-semibold text-gray-900 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {game.current_players}/{game.max_players}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                          <span>Progression du recrutement</span>
                          <span>{Math.round((game.current_players / game.max_players) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              game.current_players === game.max_players 
                                ? 'bg-green-500' 
                                : 'bg-gradient-to-r from-green-500 to-green-600'
                            }`}
                            style={{ width: `${(game.current_players / game.max_players) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      {actionButton ? (
                        <button
                          onClick={actionButton.onClick}
                          disabled={actionButton.disabled}
                          className={`w-full ${actionButton.className} text-white py-3 px-4 rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group`}
                          aria-label={`${actionButton.text} pour la partie ${game.name}`}
                        >
                          {joiningGame === game.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Connexion...
                            </>
                          ) : (
                            <>
                              {actionButton.icon}
                              {actionButton.text}
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-xl text-center font-semibold">
                          Indisponible
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  Affichage de {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filteredGames.length)} sur {filteredGames.length} parties
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:border-blue-300 disabled:opacity-50 transition-all font-medium flex items-center"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </button>
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                          }`}
                          aria-label={`Page ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:border-blue-300 disabled:opacity-50 transition-all font-medium flex items-center"
                    aria-label="Page suivante"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Sections */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Game Types Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
              <Sparkles className="h-5 w-5 mr-2" />
              Mes Parties
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Reprendre</h4>
                  <p className="text-sm text-green-700">Vos parties en cours sont marquées en vert avec le bouton "Reprendre"</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                  <Play className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Rejoindre</h4>
                  <p className="text-sm text-blue-700">Parties disponibles avec des places libres</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Rules */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
            <h3 className="font-bold text-red-900 mb-4 flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Règles de Visibilité
            </h3>
            <ul className="space-y-3 text-sm text-red-800">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Seules vos parties et les parties disponibles sont affichées</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Les parties en cours d'autres joueurs ne sont pas visibles</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Votre rôle (Joueur 1/2) est indiqué sur vos parties</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add this to your global CSS for hiding scrollbar while keeping scroll functionality */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
    
  )
}
