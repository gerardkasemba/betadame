// app/dashboard/game/components/active-games.tsx - FULLY UPDATED
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Play, Users, Clock, Trophy, MapPin, DollarSign, AlertCircle, Info } from 'lucide-react'

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
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [joiningGame, setJoiningGame] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const supabase = createClient()

  const GAMES_PER_PAGE = 9
  const GAME_CONFIG = {
    maxPlayers: 2,
    minBet: 1,
    maxBet: 100,
    allowedRegions: ['EUROPE', 'ASIA', 'AMERICA']
  }

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
    
    // Subscribe to real-time updates
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
  }, [filter, categoryFilter])

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

      if (categoryFilter !== 'all') {
        query = query.eq('game_type', categoryFilter)
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

  // Pre-join validation function
  const validateJoinGame = async (gameId: string, userId: string) => {
    try {
      const [
        { data: game, error: gameError },
        { data: profile, error: profileError },
        { data: existingParticipant, error: participantError }
      ] = await Promise.all([
        supabase.from('game_rooms').select('*').eq('id', gameId).single(),
        supabase.from('profiles').select('balance').eq('id', userId).single(),
        supabase.from('game_participants')
          .select('id')
          .eq('game_room_id', gameId)
          .eq('user_id', userId)
          .single()
      ])

      if (gameError) throw new Error('Game not found')
      if (profileError) throw new Error('Profile not found')

      return { game, profile, existingParticipant: existingParticipant && !participantError }
    } catch (error) {
      console.error('Validation error:', error)
      throw error
    }
  }

  const joinGame = async (gameId: string) => {
    try {
      setJoiningGame(gameId)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showToast('Vous devez être connecté pour rejoindre une partie', 'error')
        return
      }

      // Validate game and user
      const validation = await validateJoinGame(gameId, user.id)
      if (!validation.game || !validation.profile) {
        showToast('Partie ou profil non trouvé', 'error')
        return
      }

      const { game, profile, existingParticipant } = validation

      if (existingParticipant) {
        // User is already in the game, redirect to game page
        window.location.href = `/dashboard/game/p/${gameId}`
        return
      }

      // Check bet amount validity
      if (game.bet_amount < GAME_CONFIG.minBet || game.bet_amount > GAME_CONFIG.maxBet) {
        showToast(`Mise invalide. Doit être entre ${GAME_CONFIG.minBet}€ et ${GAME_CONFIG.maxBet}€`, 'error')
        return
      }

      // Check user balance
      if (profile.balance < game.bet_amount) {
        showToast(`Solde insuffisant. Vous avez ${profile.balance}€ mais la mise est de ${game.bet_amount}€. Veuillez recharger votre compte.`, 'error')
        return
      }

      // Check if game is still available
      if (game.status !== 'waiting' || game.current_players >= game.max_players) {
        showToast('Cette partie n\'est plus disponible pour rejoindre', 'warning')
        await loadActiveGames()
        return
      }

      // Use transaction for atomic operations
      const { error: joinError } = await supabase.rpc('join_game_transaction', {
        p_game_id: gameId,
        p_user_id: user.id,
        p_bet_amount: game.bet_amount
      })

      if (joinError) {
        console.error('Join transaction error:', joinError)
        throw new Error(joinError.message)
      }

      // Show success message
      showToast(`Vous avez rejoint la partie avec une mise de ${game.bet_amount}€. Le gagnant remportera ${getTotalPrize(game)}€!`, 'success')
      
      // Redirect after a short delay to show the success message
      setTimeout(() => {
        window.location.href = `/dashboard/game/p/${gameId}`
      }, 1500)

    } catch (error: any) {
      console.error('Error joining game:', error)
      showToast(error.message || 'Erreur lors de la connexion à la partie', 'error')
    } finally {
      setJoiningGame(null)
    }
  }

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
        window.location.href = `/dashboard/game/p/${gameId}`
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
        showToast(`Solde insuffisant. Vous avez ${profile.balance}€ mais la mise est de ${game.bet_amount}€. Veuillez recharger votre compte.`, 'error')
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

      showToast(`Vous avez rejoint la partie en tant que Joueur ${playerNumber} avec une mise de ${game.bet_amount}€. Le gagnant remportera ${getTotalPrize(game)}€!`, 'success')
      
      setTimeout(() => {
        window.location.href = `/dashboard/game/p/${gameId}`
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
    return status === 'playing' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }

  const getStatusText = (status: string) => {
    return status === 'playing' ? 'En cours' : 'En attente'
  }

  const getGameTypeColor = (gameType?: string) => {
    switch (gameType) {
      case 'ranked': return 'bg-purple-100 text-purple-800'
      case 'friendly': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGameTypeText = (gameType?: string) => {
    switch (gameType) {
      case 'ranked': return 'Classée'
      case 'friendly': return 'Amicale'
      default: return 'Rapide'
    }
  }

  // Pagination
  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE)
  const paginatedGames = games.slice(
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
            className={`p-4 rounded-lg shadow-lg border-l-4 ${
              toast.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-800'
                : toast.type === 'warning'
                ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                : 'bg-red-50 border-red-500 text-red-800'
            }`}
          >
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground text-gray-900 font-heading">
            Parties Disponibles
          </h2>
          <p className="text-gray-600 mt-2">
            Rejoignez une partie et tentez de remporter le jackpot!
          </p>
        </div>

        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Toutes les parties
            </button>
            <button
              onClick={() => setFilter('waiting')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'waiting' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('playing')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'playing' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              En cours
            </button>
          </div>

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg text-gray-600 border border-gray-300 bg-white"
          >
            <option value="all">Tous les types</option>
            <option value="quick">Parties rapides</option>
            <option value="ranked">Classées</option>
            <option value="friendly">Amicales</option>
          </select>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-2">Chargement des parties...</p>
          </div>
        ) : paginatedGames.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucune partie active pour le moment</p>
            <button 
              onClick={() => window.location.href = '/dashboard/game'}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer une partie
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedGames.map(game => (
                <div key={game.id} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                  {/* Game Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                    {/* Game name */}
                    <h4 className="font-semibold text-base sm:text-lg text-gray-900 truncate">
                      {game.name}
                    </h4>

                    {/* Status + Type badges */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(
                          game.status
                        )}`}
                      >
                        {getStatusText(game.status)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs sm:text-sm font-medium ${getGameTypeColor(
                          game.game_type
                        )}`}
                      >
                        {getGameTypeText(game.game_type)}
                      </span>
                    </div>
                  </div>


                  {/* Prize Pool */}
                  <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-yellow-800">Jackpot:</span>
                      <span className="flex items-center font-bold text-yellow-900">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {getTotalPrize(game)}€
                      </span>
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">
                      {game.max_players} joueurs × {game.bet_amount}€ chacun
                    </div>
                  </div>

                  {/* Game Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Mise par joueur:</span>
                      <span className="font-semibold flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {game.bet_amount}€
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Joueurs:</span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {game.current_players}/{game.max_players}
                      </span>
                    </div>

                    {game.region && (
                      <div className="flex items-center justify-between">
                        <span>Région:</span>
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {game.region}
                        </span>
                      </div>
                    )}

                    {game.estimated_duration && (
                      <div className="flex items-center justify-between">
                        <span>Durée estimée:</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {game.estimated_duration}min
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Créée:</span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(game.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4">
                    {game.status === 'waiting' && game.current_players < game.max_players ? (
                      <button
                        onClick={() => joinGameFallback(game.id)}
                        disabled={joiningGame === game.id}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {joiningGame === game.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Traitement...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Joindre ({game.bet_amount}€)
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => window.location.href = `/dashboard/game/p/${game.id}`}
                        className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold"
                      >
                        {game.status === 'playing' ? 'Rejoindre' : 'Complet'}
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progression:</span>
                      <span>{game.current_players}/{game.max_players}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(game.current_players / game.max_players) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  Précédent
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}

        {/* Game Instructions */}
        <GameInstructions />

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Comment ça marche ?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Chaque joueur mise le même montant (ex: 5€)</li>
            <li>Le jackpot total = mise × nombre de joueurs (ex: 5€ × 2 = 10€)</li>
            <li>Le gagnant remporte la totalité du jackpot</li>
            <li>Votre mise est déduite de votre solde lorsque vous rejoignez</li>
            <li>En cas d'abandon, votre mise reste dans le jackpot</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Game Instructions Component
const GameInstructions = () => (
  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
      <Info className="h-4 w-4 mr-2" />
      📋 Règles du jeu
    </h3>
    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
      <li>Votre mise est déduite immédiatement lorsque vous rejoignez</li>
      <li>Le jackpot est remporté par le vainqueur de la partie</li>
      <li>En cas d'abandon, votre mise n'est pas remboursée</li>
      <li>Les parties commencent automatiquement quand tous les joueurs sont prêts</li>
      <li>Respectez les autres joueurs et les règles du jeu</li>
    </ul>
  </div>
)