// app/dashboard/components/recent-games.tsx - UPDATED VERSION
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  Gamepad2, 
  Trophy, 
  Clock, 
  Users, 
  DollarSign, 
  RotateCcw, 
  Crown, 
  Play,
  Filter,
  Zap,
  AlertCircle
} from 'lucide-react'
import { TbPlayCardStar } from "react-icons/tb";
import { PiCheckerboardFill } from "react-icons/pi";
import { fr } from '@/lib/i18n'

interface Game {
  id: string
  name: string
  bet_amount: number
  status: string
  created_at: string
  winner_id: string | null
  current_players?: number
  max_players?: number
  game_type?: string
  profiles?: {
    username: string
  }
  participants?: Array<{
    user_id: string
    player_number: number
  }>
}

interface RecentGamesProps {
  initialGames: Game[]
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

export default function RecentGames({ initialGames }: RecentGamesProps) {
  const [games, setGames] = useState<Game[]>(initialGames)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'playing' | 'finished'>('all')
  const [joiningGame, setJoiningGame] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

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

  // Load games with participants - FIXED ERROR
  const loadGamesWithParticipants = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gamesData, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          participants:game_participants(user_id, player_number),
          profiles:winner_id(username)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error loading games:', error)
        return
      }

      if (gamesData) {
        setGames(gamesData)
      }
    } catch (error) {
      console.error('Error loading games:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadCurrentUser()

    // Only setup real-time updates if we have initial games
    const subscription = supabase
      .channel('game_rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => loadGamesWithParticipants()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [loadCurrentUser, loadGamesWithParticipants, supabase])

  // Check if current user is in a game
  const isUserInGame = useCallback((game: Game): boolean => {
    if (!currentUserId || !game.participants) return false
    return game.participants.some(participant => participant.user_id === currentUserId)
  }, [currentUserId])

  // Get user's role in game
  const getUserRoleInGame = useCallback((game: Game): string => {
    if (!currentUserId || !game.participants) return ''
    const participant = game.participants.find(p => p.user_id === currentUserId)
    return participant ? `Joueur ${participant.player_number}` : ''
  }, [currentUserId])

  // Filter games based on status and user participation
  const getVisibleGames = useCallback((games: Game[]): Game[] => {
    return games.filter(game => {
      // Apply status filter
      if (filter !== 'all' && game.status !== filter) return false
      
      // For waiting and playing games, only show if user is in them or they're available to join
      if (game.status === 'waiting' || game.status === 'playing') {
        if (isUserInGame(game)) return true
        if (game.status === 'waiting' && game.current_players && game.max_players && game.current_players < game.max_players) return true
        return false
      }
      
      // For finished games, show all
      return true
    })
  }, [filter, isUserInGame])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'finished':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'playing':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'waiting':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'finished':
        return <Trophy className="h-3 w-3" />
      case 'playing':
        return <Zap className="h-3 w-3" />
      case 'waiting':
        return <Clock className="h-3 w-3" />
      default:
        return <Gamepad2 className="h-3 w-3" />
    }
  }, [])

  const getGameTypeIcon = useCallback((gameType?: string) => {
    switch (gameType) {
      case 'checkers_ranked':
      case 'checkers':
        return <PiCheckerboardFill className="h-3 w-3" />
      case 'inter_demande':
        return <TbPlayCardStar className="h-3 w-3" />
      default:
        return <PiCheckerboardFill className="h-3 w-3" />
    }
  }, [])

  const getGameTypeText = useCallback((gameType?: string) => {
    switch (gameType) {
      case 'checkers_ranked':
        return 'Classées'
      case 'checkers':
        return 'Rapides'
      case 'inter_demande':
        return 'Inter'
      default:
        return 'Rapides'
    }
  }, [])

  const detectGameTypeFromName = useCallback((gameName: string, gameType?: string): string => {
    if (gameType) return gameType;
    
    const name = gameName.toLowerCase();
    if (name.includes('inter') || name.includes('carte') || name.includes('card')) {
      return 'inter_demande';
    }
    return 'checkers';
  }, [])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
  }, [])

  // Enhanced join game function
  const joinGameFallback = async (gameId: string, gameType?: string, gameName?: string) => {
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
        const detectedGameType = detectGameTypeFromName(game.name, game.game_type)
        const gamePath = detectedGameType === 'inter_demande' 
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

      if (!currentGame || currentGame.status !== 'waiting' || 
          (currentGame.current_players && currentGame.max_players && currentGame.current_players >= currentGame.max_players)) {
        showToast('Cette partie n\'est plus disponible pour rejoindre', 'warning')
        await loadGamesWithParticipants()
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

      // Deduct balance
      const { error: balanceError } = await supabase.rpc('decrement_balance', {
        user_id: user.id,
        amount: game.bet_amount
      })

      if (balanceError) {
        console.error('Balance update error:', balanceError)
        showToast('Erreur lors de la déduction du solde', 'error')
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
        await supabase.rpc('increment_balance', {
          user_id: user.id,
          amount: game.bet_amount
        })
        showToast('Erreur lors de l\'enregistrement de la transaction', 'error')
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
        await supabase.rpc('increment_balance', {
          user_id: user.id,
          amount: game.bet_amount
        })
        showToast('Erreur lors de la connexion à la partie', 'error')
        return
      }

      // Update game room
      const newPlayerCount = (currentGame.current_players || 0) + 1
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          current_players: newPlayerCount,
          status: (currentGame.max_players && newPlayerCount >= currentGame.max_players) ? 'playing' : 'waiting'
        })
        .eq('id', gameId)

      if (updateError) {
        console.error('Update error:', updateError)
        showToast('Erreur lors de la mise à jour de la partie', 'error')
        return
      }

      showToast(`Vous avez rejoint la partie en tant que Joueur ${playerNumber} avec une mise de ${game.bet_amount}$!`, 'success')
      
      setTimeout(() => {
        const detectedGameType = detectGameTypeFromName(game.name, game.game_type)
        const gamePath = detectedGameType === 'inter_demande' 
          ? `/dashboard/game/inter/${gameId}`
          : `/dashboard/game/p/${gameId}`
        window.location.href = gamePath
      }, 1500)

    } catch (error) {
      console.error('Error joining game:', error)
      showToast('Erreur lors de la connexion à la partie', 'error')
    } finally {
      setJoiningGame(null)
    }
  }

  // Get appropriate button for game
  const getGameActionButton = useCallback((game: Game) => {
    const userInGame = isUserInGame(game)
    const userRole = getUserRoleInGame(game)

    if (userInGame && (game.status === 'playing' || game.status === 'waiting')) {
      // User is already in this active game - show Resume button
      return {
        text: `Reprendre`,
        icon: <RotateCcw className="h-3 w-3 mr-1" />,
        onClick: () => {
          const detectedGameType = detectGameTypeFromName(game.name, game.game_type)
          const gamePath = detectedGameType === 'inter_demande' 
            ? `/dashboard/game/inter/${game.id}`
            : `/dashboard/game/p/${game.id}`
          window.location.href = gamePath
        },
        className: 'bg-green-500 hover:bg-green-600 text-white',
        disabled: false
      }
    } else if (game.status === 'waiting' && game.current_players && game.max_players && game.current_players < game.max_players) {
      // User can join this waiting game
      return {
        text: `Rejoindre - ${game.bet_amount}$`,
        icon: <Play className="h-3 w-3 mr-1" />,
        onClick: () => joinGameFallback(game.id, game.game_type, game.name),
        className: 'bg-blue-500 hover:bg-blue-600 text-white',
        disabled: joiningGame === game.id
      }
    }
    
    return null
  }, [isUserInGame, getUserRoleInGame, detectGameTypeFromName, joiningGame, joinGameFallback])

  // Filter games based on visibility rules (SEARCH REMOVED)
  const filteredGames = useMemo(() => {
    return getVisibleGames(games)
  }, [games, getVisibleGames])

  // Stats for the header
  const gameStats = useMemo(() => ({
    total: games.length,
    waiting: games.filter(g => g.status === 'waiting' && g.current_players && g.max_players && g.current_players < g.max_players).length,
    playing: games.filter(g => g.status === 'playing' && isUserInGame(g)).length,
    finished: games.filter(g => g.status === 'finished').length
  }), [games, isUserInGame])

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3 rounded-lg shadow-lg border-l-4 backdrop-blur-sm max-w-xs text-sm ${
              toast.type === 'success' 
                ? 'bg-green-50/95 border-green-500 text-green-800'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-500 text-amber-800'
                : 'bg-red-50/95 border-red-500 text-red-800'
            }`}
          >
            <div className="flex items-center">
              <AlertCircle className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 font-heading">
            {fr.dashboard.recentGames}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {gameStats.total} total
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              {gameStats.waiting} en attente
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {gameStats.playing} en cours
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {gameStats.finished} terminées
            </span>
          </div>
        </div>
        
        <Link
          href="/dashboard/game"
          className="text-sm text-primary hover:text-blue-700 font-medium whitespace-nowrap self-start lg:self-auto"
        >
          Voir tout
        </Link>
      </div>

      {/* Filter Section - SEARCH BAR REMOVED */}
      <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Status Filter Only - No Search Bar */}
          <div className="flex gap-1 w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg transition-all text-xs font-medium flex-1 sm:flex-none ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('waiting')}
              className={`px-3 py-2 rounded-lg transition-all text-xs font-medium flex-1 sm:flex-none ${
                filter === 'waiting' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-amber-300'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('playing')}
              className={`px-3 py-2 rounded-lg transition-all text-xs font-medium flex-1 sm:flex-none ${
                filter === 'playing' 
                  ? 'bg-red-500 text-white shadow-sm' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-red-300'
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => setFilter('finished')}
              className={`px-3 py-2 rounded-lg transition-all text-xs font-medium flex-1 sm:flex-none ${
                filter === 'finished' 
                  ? 'bg-green-500 text-white shadow-sm' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-green-300'
              }`}
            >
              Terminées
            </button>
          </div>
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-3">
        {filteredGames.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <Gamepad2 className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">
              {filter === 'all' ? 'Aucune partie trouvée' : 
               filter === 'waiting' ? 'Aucune partie en attente disponible' :
               filter === 'playing' ? 'Aucune de vos parties en cours' :
               'Aucune partie terminée'}
            </p>
            <Link
              href="/dashboard/game"
              className="inline-block mt-2 text-primary hover:text-blue-700 font-medium text-sm sm:text-base"
            >
              Créer une nouvelle partie
            </Link>
          </div>
        ) : (
          filteredGames.map((game) => {
            const detectedGameType = detectGameTypeFromName(game.name, game.game_type);
            const gameTypeText = getGameTypeText(detectedGameType);
            const gameTypeIcon = getGameTypeIcon(detectedGameType);
            const actionButton = getGameActionButton(game);
            const userInGame = isUserInGame(game);
            const userRole = getUserRoleInGame(game);
            
            return (
              <div 
                key={game.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border transition-colors gap-3 sm:gap-4 ${
                  userInGame 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {/* Left Section - Game Info */}
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className={`p-2 rounded-full border ${getStatusColor(game.status)} flex-shrink-0`}>
                    {getStatusIcon(game.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Game Name and Type */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {game.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center space-x-1 px-2 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-300 w-fit">
                          {gameTypeIcon}
                          <span className="hidden xs:inline">{gameTypeText}</span>
                        </span>
                        {userInGame && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            {userRole}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Game Details */}
                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs text-gray-600">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 flex-shrink-0" />
                        <span>{game.bet_amount}$</span>
                      </span>
                      
                      {game.current_players && game.max_players && (
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span>{game.current_players}/{game.max_players}</span>
                        </span>
                      )}
                      
                      <span className="text-xs">{formatDate(game.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Section - Status and Actions */}
                <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-end sm:items-end gap-2 sm:gap-2 w-full sm:w-auto">
                  {/* Status Badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(game.status)} whitespace-nowrap`}>
                    {game.status === 'finished' ? 'Terminé' : 
                     game.status === 'playing' ? 'En cours' : 
                     game.status === 'waiting' ? 'En attente' : 'Inconnu'}
                  </span>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {actionButton ? (
                      <button
                        onClick={actionButton.onClick}
                        disabled={actionButton.disabled}
                        className={`inline-flex items-center px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                          actionButton.className
                        } ${actionButton.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {joiningGame === game.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Connexion...
                          </>
                        ) : (
                          <>
                            {actionButton.icon}
                            {actionButton.text}
                          </>
                        )}
                      </button>
                    ) : game.status === 'finished' && game.winner_id && game.profiles ? (
                      <div className="text-xs text-gray-600 truncate max-w-[120px] text-right">
                        Gagnant: {game.profiles.username}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}