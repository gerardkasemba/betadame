// app/dashboard/game/components/active-games.tsx - REDESIGNED
'use client'

import { useState, useEffect } from 'react'
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
  Sparkles
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
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning'
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
  const supabase = createClient()

  const GAMES_PER_PAGE = 9

  // Toast system
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  useEffect(() => {
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
  }, [filter, gameTypeFilter])

  const loadActiveGames = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('game_rooms')
        .select('*')
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
  }

  const getGameTypeConfig = (gameType?: string) => {
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
          bgColor: 'bg-gradient-to-br from-ywllow-50 to-yellow-50',
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
  }

  // Add this missing function
  const getGameTypeText = (gameType?: string) => {
    switch (gameType) {
      case 'checkers_ranked': return 'Dames Classées'
      case 'checkers': return 'Dames Rapides'
      case 'inter_demande': return 'Jeux d\'Inter'
      default: return 'Dames Rapides'
    }
  }

  // Filter games based on search term
  const filteredGames = games.filter(game => 
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getGameTypeText(game.game_type).toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Fallback join function if RPC is not available
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
      const { data: existingParticipant } = await supabase
        .from('game_participants')
        .select('id, player_number, is_ready')
        .eq('game_room_id', gameId)
        .eq('user_id', user.id)
        .single()

      if (existingParticipant) {
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
      showToast('Erreur lors de la connexion à la partie', 'error')
    } finally {
      setJoiningGame(null)
    }
  }

  const getTotalPrize = (game: ActiveGame) => {
    return game.bet_amount * game.max_players
  }

  const getStatusColor = (status: string) => {
    return status === 'playing' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-amber-100 text-amber-800 border-amber-200'
  }

  const getStatusIcon = (status: string) => {
    return status === 'playing' 
      ? <Zap className="h-3 w-3 mr-1" />
      : <Clock className="h-3 w-3 mr-1" />
  }



  // Pagination
  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE)
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE
  )

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border-l-4 backdrop-blur-sm ${
              toast.type === 'success' 
                ? 'bg-red-50/95 border-red-500 text-red-800'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-500 text-amber-800'
                : 'bg-yellow-50/95 border-yellow-500 text-yellow-800'
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
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-blue-500 rounded-2xl blur opacity-20"></div>
            <Trophy className="h-16 w-16 text-blue-600 relative z-10 mx-auto mb-4" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent font-heading mb-3">
            Arène de Jeux
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Rejoignez des parties passionnantes et competez pour remporter des récompenses exceptionnelles
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total des parties</p>
                <p className="text-2xl font-bold text-blue-900">{games.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-50 rounded-2xl p-4 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {games.filter(g => g.status === 'waiting').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-50 rounded-2xl p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">En cours</p>
                <p className="text-2xl font-bold text-red-900">
                  {games.filter(g => g.status === 'playing').length}
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
                  className="pl-10 pr-4 py-3 w-full sm:w-64 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-3 rounded-xl transition-all font-medium ${
                    filter === 'all' 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('waiting')}
                  className={`px-4 py-3 rounded-xl transition-all font-medium ${
                    filter === 'waiting' 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-amber-300'
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => setFilter('playing')}
                  className={`px-4 py-3 rounded-xl transition-all font-medium ${
                    filter === 'playing' 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-red-300'
                  }`}
                >
                  En cours
                </button>
              </div>
            </div>

            {/* Game Type Filter */}
            <select 
              value={gameTypeFilter}
              onChange={(e) => setGameTypeFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="all">🎮 Tous les jeux</option>
              <option value="checkers">♟️ Jeux de Dames</option>
              <option value="cards">🎴 Jeux d'Inter</option>
            </select>
          </div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Chargement des parties...</p>
          </div>
        ) : paginatedGames.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
              <Trophy className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune partie trouvée</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm ? 'Aucune partie ne correspond à votre recherche.' : 'Il n\'y a aucune partie active pour le moment.'}
            </p>
            <button 
              onClick={() => window.location.href = '/dashboard/game'}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-500 text-white rounded-xl hover:from-blue-600 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 font-semibold"
            >
              Créer la première partie
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {paginatedGames.map(game => {
                const config = getGameTypeConfig(game.game_type)
                
                return (
                  <div 
                    key={game.id} 
                    className={`rounded-2xl border-2 ${config.borderColor} bg-white p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group`}
                  >
                    {/* Game Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-r ${config.color} text-white shadow-lg`}>
                          {config.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-gray-800">
                            {game.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(game.status)} border`}>
                              <span className="flex items-center">
                                {getStatusIcon(game.status)}
                                {game.status === 'playing' ? 'En cours' : 'En attente'}
                              </span>
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.textColor} bg-white/80 border ${config.borderColor}`}>
                              {config.badge}
                            </span>
                          </div>
                        </div>
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
                                ? 'bg-red-500' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-500'
                            }`}
                            style={{ width: `${(game.current_players / game.max_players) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      {game.status === 'waiting' && game.current_players < game.max_players ? (
                        <button
                          onClick={() => joinGameFallback(game.id)}
                          disabled={joiningGame === game.id}
                          className={`w-full bg-gradient-to-r ${config.color} text-white py-3 px-4 rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group`}
                        >
                          {joiningGame === game.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Connexion...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Rejoindre - {game.bet_amount}$
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const gamePath = game.game_type === 'inter_demande' 
                              ? `/dashboard/game/inter/${game.id}`
                              : `/dashboard/game/p/${game.id}`
                            window.location.href = gamePath
                          }}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 px-4 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-semibold"
                        >
                          {game.status === 'playing' ? 'Spectateur' : 'Complet'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-3 rounded-xl bg-white border border-gray-300 text-gray-700 hover:border-blue-300 disabled:opacity-50 transition-all font-medium"
                >
                  ← Précédent
                </button>
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-6 py-3 rounded-xl bg-white border border-gray-300 text-gray-700 hover:border-blue-300 disabled:opacity-50 transition-all font-medium"
                >
                  Suivant →
                </button>
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
              Types de Jeux Disponibles
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-500 rounded-lg text-white">
                  <PiCheckerboardFill className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Jeux de Dames</h4>
                  <p className="text-sm text-blue-700">Stratégie classique sur plateau - Déplacez vos pièces avec intelligence</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-yellow-500 rounded-lg text-white">
                  <TbPlayCardStar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-900">Jeux d'Inter</h4>
                  <p className="text-sm text-yellow-700">Cartes spéciales et défis dynamiques - Effets uniques et stratégie</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Rules */}
          <div className="bg-gradient-to-br from-red-50 to-red-50 rounded-2xl p-6 border border-red-200">
            <h3 className="font-bold text-red-900 mb-4 flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Règles du Jeu
            </h3>
            <ul className="space-y-3 text-sm text-red-800">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Votre mise est déduite immédiatement en rejoignant</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Le jackpot total est remporté par le vainqueur</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Respectez les autres joueurs et les règles</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Les parties commencent automatiquement quand pleines</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}