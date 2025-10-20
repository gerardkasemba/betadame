// components/UserGameProfile.tsx
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
  Play,
  AlertCircle,
  Star,
  User,
  Plus,
  Zap,
  History,
  Sparkles
} from 'lucide-react'
import { TbPlayCardStar } from "react-icons/tb";
import { PiCheckerboardFill } from "react-icons/pi";

interface Game {
  id: string
  name: string
  bet_amount: number
  status: string
  created_at: string
  winner_id: string | null
  current_players: number
  max_players: number
  game_type: string
  created_by: string
  region: string
  invitation_code: string
  participants?: Array<{
    user_id: string
    player_number: number
  }>
  user_relations?: {
    is_creator: boolean
    is_participant: boolean
    is_winner: boolean
    player_number?: number
  }
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
}

export default function UserGameProfile() {
  const [activeTab, setActiveTab] = useState<'new' | 'my_rooms' | 'ongoing' | 'completed'>('new')
  const [games, setGames] = useState<Game[]>([])
  const [joiningGame, setJoiningGame] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected')
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
      return user
    } catch (error) {
      console.error('Error loading current user:', error)
      showToast('Erreur de connexion', 'error')
      return null
    }
  }, [supabase.auth, showToast])

  // Load games with participants and user relations - SIMPLIFIED
  const loadGamesWithRelations = useCallback(async () => {
    try {
      setLoading(true)
      const user = await loadCurrentUser()
      if (!user) {
        setLoading(false)
        return
      }

      console.log('Loading games for user:', user.id)

      // First, get all game rooms
      const { data: gamesData, error } = await supabase
        .from('game_rooms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading games:', error)
        showToast('Erreur lors du chargement des parties', 'error')
        setLoading(false)
        return
      }

      if (!gamesData) {
        setGames([])
        setLoading(false)
        return
      }

      // Then, get participants for these games
      const gameIds = gamesData.map(game => game.id)
      const { data: participantsData, error: participantsError } = await supabase
        .from('game_participants')
        .select('*')
        .in('game_room_id', gameIds)

      if (participantsError) {
        console.error('Error loading participants:', participantsError)
        // Continue without participants data
      }

      // Combine data and add user relations
      const gamesWithRelations = gamesData.map(game => {
        const gameParticipants = participantsData?.filter(p => p.game_room_id === game.id) || []
        const userParticipation = gameParticipants.find(p => p.user_id === user.id)
        const isUserCreator = game.created_by === user.id
        const isUserParticipant = !!userParticipation
        const isUserWinner = game.winner_id === user.id

        return {
          ...game,
          participants: gameParticipants,
          user_relations: {
            is_creator: isUserCreator,
            is_participant: isUserParticipant,
            is_winner: isUserWinner,
            player_number: userParticipation?.player_number
          }
        }
      })

      console.log('Loaded games:', gamesWithRelations.length)
      setGames(gamesWithRelations)
      
    } catch (error) {
      console.error('Error in loadGamesWithRelations:', error)
      showToast('Erreur lors du chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }, [loadCurrentUser, showToast, supabase])

  // Initial load
  useEffect(() => {
    loadGamesWithRelations()
  }, [loadGamesWithRelations])

  // Simple real-time subscription - only after initial load
  useEffect(() => {
    if (!loading) {
      console.log('Setting up real-time subscription...')
      
      const subscription = supabase
        .channel('game_rooms_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_rooms'
          },
          (payload) => {
            console.log('Real-time update received:', payload)
            // Refresh the data when changes occur
            loadGamesWithRelations()
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
          setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected')
        })

      return () => {
        console.log('Cleaning up subscription...')
        subscription.unsubscribe()
      }
    }
  }, [loading, loadGamesWithRelations, supabase])

  // Filter games based on active tab
  const getFilteredGames = useCallback(() => {
    switch (activeTab) {
      case 'new':
        return games.filter(game => 
          game.status === 'waiting' && 
          !game.user_relations?.is_participant && 
          !game.user_relations?.is_creator &&
          game.current_players < game.max_players
        )
      
      case 'my_rooms':
        return games.filter(game => game.user_relations?.is_creator)
      
      case 'ongoing':
        return games.filter(game => 
          (game.user_relations?.is_participant || game.user_relations?.is_creator) && 
          (game.status === 'playing' || game.status === 'waiting')
        )
      
      case 'completed':
        return games.filter(game => 
          game.status === 'finished' && 
          (game.user_relations?.is_participant || game.user_relations?.is_creator)
        )
      
      default:
        return []
    }
  }, [games, activeTab])

  // Helper functions
  const isUserInGame = useCallback((game: Game): boolean => {
    return game.user_relations?.is_participant || false
  }, [])

  const isUserCreator = useCallback((game: Game): boolean => {
    return game.user_relations?.is_creator || false
  }, [])

  const isUserWinner = useCallback((game: Game): boolean => {
    return game.user_relations?.is_winner || false
  }, [])

  const getUserRoleInGame = useCallback((game: Game): string => {
    if (game.user_relations?.is_creator) return 'Créateur'
    if (game.user_relations?.player_number) return `Joueur ${game.user_relations.player_number}`
    return ''
  }, [])

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
        return <Trophy className="h-4 w-4" />
      case 'playing':
        return <Zap className="h-4 w-4" />
      case 'waiting':
        return <Clock className="h-4 w-4" />
      default:
        return <Gamepad2 className="h-4 w-4" />
    }
  }, [])

  const getGameTypeIcon = useCallback((gameType: string) => {
    switch (gameType) {
      case 'checkers_ranked':
      case 'checkers':
        return <PiCheckerboardFill className="h-4 w-4" />
      case 'inter_damande':
        return <TbPlayCardStar className="h-4 w-4" />
      default:
        return <PiCheckerboardFill className="h-4 w-4" />
    }
  }, [])

  const getGameTypeText = useCallback((gameType: string) => {
    switch (gameType) {
      case 'checkers_ranked':
        return 'Classées'
      case 'checkers':
        return 'Dames'
      case 'inter_damande':
        return 'Inter'
      default:
        return 'Dames'
    }
  }, [])

  const getUserBadge = useCallback((game: Game) => {
    if (game.user_relations?.is_creator) {
      return {
        text: 'Votre partie',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Star className="h-3 w-3" />
      }
    }
    if (game.user_relations?.is_winner) {
      return {
        text: 'Gagnant',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Trophy className="h-3 w-3" />
      }
    }
    if (game.user_relations?.is_participant) {
      return {
        text: getUserRoleInGame(game),
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <User className="h-3 w-3" />
      }
    }
    return null
  }, [getUserRoleInGame])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffMinutes = Math.floor(diffTime / (1000 * 60))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'À l\'instant'
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
  }, [])

  // Simplified join game function
  const joinGame = async (gameId: string) => {
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
        const gamePath = game.game_type === 'inter_damande' 
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
        showToast('Profil non trouvé', 'error')
        return
      }

      if (profile.balance < game.bet_amount) {
        showToast(`Solde insuffisant: ${profile.balance}$ / ${game.bet_amount}$`, 'error')
        return
      }

      // Check if game is still available
      const { data: currentGame } = await supabase
        .from('game_rooms')
        .select('current_players, max_players, status')
        .eq('id', gameId)
        .single()

      if (!currentGame || currentGame.status !== 'waiting' || 
          currentGame.current_players >= currentGame.max_players) {
        showToast('Partie complète ou terminée', 'warning')
        await loadGamesWithRelations()
        return
      }

      // Determine player number
      const playerNumber = currentGame.current_players + 1

      // Join game (simplified - you might want to use your RPC functions here)
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
        showToast('Erreur de connexion à la partie', 'error')
        return
      }

      // Update game room
      const newPlayerCount = currentGame.current_players + 1
      await supabase
        .from('game_rooms')
        .update({ 
          current_players: newPlayerCount,
          status: newPlayerCount >= currentGame.max_players ? 'playing' : 'waiting'
        })
        .eq('id', gameId)

      showToast(`Partie rejointe! Mise: ${game.bet_amount}$`, 'success')
      
      // Redirect to game
      setTimeout(() => {
        const gamePath = game.game_type === 'inter_damande' 
          ? `/game/inter/${gameId}`
          : `/game/p/${gameId}`
        window.location.href = gamePath
      }, 1000)

    } catch (error) {
      console.error('Error joining game:', error)
      showToast('Erreur lors de la connexion', 'error')
    } finally {
      setJoiningGame(null)
    }
  }

  // Get appropriate button for game
  const getGameActionButton = useCallback((game: Game) => {
    const userInGame = isUserInGame(game)
    const userIsCreator = isUserCreator(game)

    if (userInGame && (game.status === 'playing' || game.status === 'waiting')) {
      return {
        text: `Reprendre`,
        icon: <RotateCcw className="h-3 w-3 mr-1" />,
        onClick: () => {
          const gamePath = game.game_type === 'inter_damande' 
            ? `/game/inter/${game.id}`
            : `/game/p/${game.id}`
          window.location.href = gamePath
        },
        className: 'bg-green-500 hover:bg-green-600 text-white shadow-sm',
        disabled: false
      }
    } else if (game.status === 'waiting' && game.current_players < game.max_players && !userInGame && !userIsCreator) {
      return {
        text: `Rejoindre ${game.bet_amount}$`,
        icon: <Play className="h-3 w-3 mr-1" />,
        onClick: () => joinGame(game.id),
        className: 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm',
        disabled: joiningGame === game.id
      }
    }
    
    return null
  }, [isUserInGame, isUserCreator, joiningGame, joinGame])

  // Stats for each tab
  const getTabStats = useCallback(() => {
    return {
      new: games.filter(game => 
        game.status === 'waiting' && 
        !game.user_relations?.is_participant && 
        !game.user_relations?.is_creator &&
        game.current_players < game.max_players
      ).length,
      my_rooms: games.filter(game => game.user_relations?.is_creator).length,
      ongoing: games.filter(game => 
        (game.user_relations?.is_participant || game.user_relations?.is_creator) && 
        (game.status === 'playing' || game.status === 'waiting')
      ).length,
      completed: games.filter(game => 
        game.status === 'finished' && 
        (game.user_relations?.is_participant || game.user_relations?.is_creator)
      ).length
    }
  }, [games])

  const tabStats = getTabStats()
  const filteredGames = getFilteredGames()

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center justify-center mb-4">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
        connectionStatus === 'connected' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          connectionStatus === 'connected' 
            ? 'bg-green-500 animate-pulse' 
            : 'bg-red-500'
        }`} />
        {connectionStatus === 'connected' ? 'Connecté en temps réel' : 'Hors ligne'}
      </div>
    </div>
  )

  // Debug loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des parties...</p>
              <p className="text-gray-400 text-sm mt-2">Veuillez patienter</p>
              <button 
                onClick={() => loadGamesWithRelations()}
                className="mt-4 text-blue-500 text-sm hover:text-blue-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-lg border-l-4 backdrop-blur-sm ${
                toast.type === 'success' 
                  ? 'bg-green-50/95 border-green-500 text-green-800'
                  : toast.type === 'warning'
                  ? 'bg-amber-50/95 border-amber-500 text-amber-800'
                  : 'bg-red-50/95 border-red-500 text-red-800'
              }`}
            >
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="font-medium text-sm">{toast.message}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mes Jeux
              </h1>
              <p className="text-gray-600 mt-1 text-sm">Parties en temps réel</p>
            </div>
            
            <Link
              href="/dashboard/game/"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all text-sm font-medium shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle Partie</span>
              <span className="sm:hidden">Nouveau</span>
            </Link>
          </div>

          {/* <ConnectionIndicator /> */}

          {/* Tab Navigation */}
        <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl p-1.5 mb-6 shadow-sm">
        <div className="grid grid-cols-4 gap-1.5">
            {[
            { key: 'new' as const, label: 'Nouveaux', icon: <Sparkles className="w-5 h-5" />, mobileLabel: 'Nouveaux' },
            { key: 'my_rooms' as const, label: 'Mes Salles', icon: <Star className="w-5 h-5" />, mobileLabel: 'Mes Salles' },
            { key: 'ongoing' as const, label: 'En Cours', icon: <Zap className="w-5 h-5" />, mobileLabel: 'En Cours' },
            { key: 'completed' as const, label: 'Terminées', icon: <History className="w-5 h-5" />, mobileLabel: 'Terminées' }
            ].map((tab) => (
            <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                relative flex flex-col items-center gap-1.5
                p-3 sm:p-4 rounded-xl
                transition-all duration-200 ease-out
                active:scale-95
                ${activeTab === tab.key 
                    ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/60 hover:scale-[1.01]'
                }
                `}
            >
                {/* Icon with optional badge */}
                <div className="relative">
                <div className={`
                    flex items-center justify-center 
                    w-9 h-9 sm:w-10 sm:h-10
                    rounded-lg
                    transition-all duration-200
                    ${activeTab === tab.key 
                    ? 'bg-blue-50' 
                    : 'bg-transparent'
                    }
                `}>
                    {tab.icon}
                </div>
                
                {/* Badge for count */}
                {tabStats[tab.key] > 0 && (
                    <div className={`
                    absolute -top-1.5 -right-1.5
                    min-w-[18px] h-[18px] px-1
                    flex items-center justify-center
                    rounded-full text-[10px] font-bold
                    transition-all duration-200
                    ${activeTab === tab.key 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-800 text-white'
                    }
                    `}>
                    {tabStats[tab.key]}
                    </div>
                )}
                </div>
                
                {/* Label */}
                <span className={`
                text-[10px] sm:text-xs font-semibold 
                text-center leading-tight
                transition-colors duration-200
                ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-600'}
                `}>
                {tab.mobileLabel}
                </span>
                
                {/* Active indicator bar */}
                {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />
                )}
            </button>
            ))}
        </div>
        </div>

          {/* Games List */}
          <div className="space-y-3">
            {filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm mb-2">
                  {activeTab === 'new' ? 'Aucune nouvelle partie disponible' : 
                   activeTab === 'my_rooms' ? 'Vous n\'avez créé aucune salle' :
                   activeTab === 'ongoing' ? 'Aucune partie en cours' :
                   'Aucune partie terminée'}
                </p>
                <button 
                  onClick={() => loadGamesWithRelations()}
                  className="text-blue-500 text-sm hover:text-blue-700"
                >
                  Actualiser
                </button>
              </div>
            ) : (
              filteredGames.map((game) => {
                const gameTypeText = getGameTypeText(game.game_type)
                const gameTypeIcon = getGameTypeIcon(game.game_type)
                const actionButton = getGameActionButton(game)
                const userBadge = getUserBadge(game)
                const userInGame = isUserInGame(game)
                
                return (
                  <div 
                    key={game.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      userInGame
                        ? 'border-green-200 bg-green-50 hover:border-green-300' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } active:scale-[0.98]`}
                  >
                    {/* Game Info */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-xl border-2 ${getStatusColor(game.status)} flex-shrink-0`}>
                        {getStatusIcon(game.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {game.name}
                          </h3>
                          <span className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600 flex-shrink-0">
                            {gameTypeIcon}
                            <span className="hidden xs:inline">{gameTypeText}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                          <span className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{game.bet_amount}$</span>
                          </span>
                          
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{game.current_players}/{game.max_players}</span>
                          </span>
                          
                          <span className="text-xs">{formatDate(game.created_at)}</span>
                        </div>

                        {userBadge && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${userBadge.color}`}>
                              {userBadge.icon}
                              <span>{userBadge.text}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(game.status)} whitespace-nowrap`}>
                        {game.status === 'finished' ? 'Terminé' : 
                         game.status === 'playing' ? 'En cours' : 
                         'En attente'}
                      </span>
                      
                      {actionButton && (
                        <button
                          onClick={actionButton.onClick}
                          disabled={actionButton.disabled}
                          className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap shadow-sm active:scale-95 ${
                            actionButton.className
                          } ${actionButton.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {joiningGame === game.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              ...
                            </>
                          ) : (
                            <>
                              {actionButton.icon}
                              {actionButton.text}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}