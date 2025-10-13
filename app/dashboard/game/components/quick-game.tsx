// app/dashboard/game/components/quick-game.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Users, DollarSign, Crown } from 'lucide-react'
import { PiCheckerboardFill } from "react-icons/pi";
import { TbPlayCardStar } from "react-icons/tb";
import { fr } from '@/lib/i18n'
import { InterCardGame } from '@/lib/inter-card'

interface QuickGameForm {
  betAmount: string
  region: string
  gameType: 'dames' | 'inter' | null
  maxPlayers: number
}

interface ValidationError {
  field: string
  message: string
}

type GameSelection = 'dames' | 'inter' | null

export default function QuickGame() {
  const [selectedGame, setSelectedGame] = useState<GameSelection>(null)
  const [form, setForm] = useState<QuickGameForm>({
    betAmount: '5.00',
    region: '',
    gameType: null,
    maxPlayers: 2
  })
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState<ValidationError | null>(null)
  const [customAmountActive, setCustomAmountActive] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const validateForm = (): boolean => {
    setValidationError(null)

    if (!form.gameType) {
      setValidationError({
        field: 'gameType',
        message: 'Veuillez sélectionner un type de jeu'
      })
      return false
    }

    const betAmount = parseFloat(form.betAmount)
    if (isNaN(betAmount) || betAmount <= 0) {
      setValidationError({
        field: 'betAmount',
        message: 'Le montant doit être supérieur à 0'
      })
      return false
    }

    if (betAmount > 1000) {
      setValidationError({
        field: 'betAmount',
        message: 'Le montant maximum est de 1000 $'
      })
      return false
    }

    const decimalPart = form.betAmount.split('.')[1]
    if (decimalPart && decimalPart.length > 2) {
      setValidationError({
        field: 'betAmount',
        message: 'Maximum 2 décimales autorisées'
      })
      return false
    }

    return true
  }

  const handleGameSelect = (gameType: 'dames' | 'inter') => {
    setSelectedGame(gameType)
    setForm(prev => ({ ...prev, gameType }))
    setValidationError(null)
  }

  const handleCreateGame = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setValidationError(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Utilisateur non connecté')
      }

      const betAmount = parseFloat(form.betAmount)

      // Vérifier le solde utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance, games_played')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw new Error('Erreur lors de la récupération du profil')
      }
      
      if (!profile) {
        throw new Error('Profil utilisateur non trouvé')
      }

      // Vérifier le solde
      if (profile.balance < betAmount) {
        setValidationError({
          field: 'betAmount',
          message: `Solde insuffisant. Votre solde: ${profile.balance.toFixed(2)} $`
        })
        setIsLoading(false)
        return
      }

      // Déterminer le type de jeu
      let gameType = 'checkers';
      let gameName = '';
      
      switch (form.gameType) {
        case 'inter':
          gameType = 'inter_demande';
          gameName = `Jeux d'Inter - ${betAmount.toFixed(2)}$`;
          break;
        case 'dames':
        default:
          gameType = 'checkers';
          gameName = `Partie de Dames - ${betAmount.toFixed(2)}$`;
      }

      // Créer la salle de jeu
      const { data: game, error: gameError } = await supabase
        .from('game_rooms')
        .insert({
          name: gameName,
          bet_amount: betAmount,
          max_players: 2,
          current_players: 1,
          status: 'waiting',
          region: form.region || null,
          created_by: user.id,
          game_type: gameType,
          board_state: form.gameType === 'inter' ? initializeInterCardGame() : initializeBoard(),
          invitation_code: Math.random().toString(36).substring(2, 8).toUpperCase()
        })
        .select()
        .single()

      if (gameError) {
        console.error('Game creation error:', gameError)
        throw new Error(`Erreur création partie: ${gameError.message}`)
      }

      if (!game) {
        throw new Error('Aucune donnée retournée après création de la partie')
      }

      // Rejoindre la partie en tant que premier joueur
      const { error: joinError } = await supabase
        .from('game_participants')
        .insert({
          game_room_id: game.id,
          user_id: user.id,
          player_number: 1,
          is_ready: true,
          joined_at: new Date().toISOString()
        })

      if (joinError) {
        console.error('Join game error:', joinError)
        await supabase.from('game_rooms').delete().eq('id', game.id)
        throw new Error(`Erreur participation: ${joinError.message}`)
      }

      // Déduire le montant du solde utilisateur
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance - betAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (balanceError) {
        console.error('Balance update error:', balanceError)
        throw new Error(`Erreur mise à jour solde: ${balanceError.message}`)
      }

      // Créer un enregistrement de transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'game_bet',
          amount: betAmount,
          status: 'completed',
          reference: `BET-${game.id}`,
          description: `Mise pour la partie ${gameName}`,
          metadata: {
            game_id: game.id,
            game_type: form.gameType,
            opponent_count: 1
          }
        })

      if (transactionError) {
        console.error('Transaction error:', transactionError)
      }

      // Rediriger vers la salle de jeu appropriée
      const gamePath = form.gameType === 'inter' 
        ? `/dashboard/game/inter/${game.id}`
        : `/dashboard/game/p/${game.id}`

      router.push(gamePath)

    } catch (error) {
      console.error('Error creating game:', error)
      setValidationError({
        field: 'general',
        message: error instanceof Error ? error.message : 'Erreur lors de la création de la partie. Veuillez réessayer.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const initializeBoard = () => {
    const board = {
      squares: Array(64).fill(null),
      currentPlayer: 'red',
      moveCount: 0,
      lastMove: null
    }
    
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8)
      const col = i % 8
      
      if ((row + col) % 2 === 1) {
        if (row < 3) {
          board.squares[i] = { player: 1, type: 'regular', id: `red-${i}` }
        } else if (row > 4) {
          board.squares[i] = { player: 2, type: 'regular', id: `yellow-${i}` }
        }
      }
    }
    
    return board
  }

  const initializeInterCardGame = () => {
    const initialState = InterCardGame.createInitialGameState();
    
    console.log('Creating Inter-Demande game with state:', initialState);
    
    return {
      deck: initialState.deck,
      player1Hand: initialState.player1Hand,
      player2Hand: initialState.player2Hand,
      pile: initialState.pile,
      currentCard: initialState.currentCard,
      playerTurn: initialState.playerTurn,
      demandedValue: initialState.demandedValue,
      status: initialState.status,
      gameOver: initialState.gameOver
    };
  }

  const handleBetAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^\d.]/g, '')
    const parts = sanitizedValue.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    
    setForm(prev => ({ ...prev, betAmount: sanitizedValue }))
    setCustomAmountActive(true)
    
    if (validationError?.field === 'betAmount') {
      setValidationError(null)
    }
  }

  const quickBetAmounts = [1, 2, 5, 10, 25, 50]

  const getGameTypeDescription = (type: string) => {
    switch (type) {
      case 'dames':
        return 'Dames classiques - Stratégie et réflexion';
      case 'inter':
        return "Jeux d'Inter - Cartes spéciales et défis dynamiques";
      default:
        return '';
    }
  }

  // First screen - Game selection
  if (!selectedGame) {
    return (
      <div className="max-w-9xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="text-center mb-8">
            <Crown className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl text-gray-900 font-bold font-heading">
              Choisissez votre Jeu
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Sélectionnez le type de jeu que vous souhaitez jouer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {/* Jeux de Dames */}
            <button
              onClick={() => handleGameSelect('dames')}
              className="group p-6 sm:p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PiCheckerboardFill className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Jeux de Dames
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">
                  Le jeu de stratégie classique avec des pièces et un plateau
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>2 joueurs</span>
                  <span>•</span>
                  <span>Stratégie</span>
                </div>
              </div>
            </button>

            {/* Jeux de Carte (Inter) */}
            <button
              onClick={() => handleGameSelect('inter')}
              className="group p-6 sm:p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TbPlayCardStar className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Jeux d'Inter
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">
                  Jeu de cartes dynamique avec effets spéciaux et défis
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>2 joueurs</span>
                  <span>•</span>
                  <span>Cartes spéciales</span>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Les deux jeux supportent les mises et les parties en temps réel
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Second screen - Game configuration
  return (
    <div className="max-w-9xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-8">
          <button
            onClick={() => {
              setSelectedGame(null)
              setForm(prev => ({ ...prev, gameType: null }))
            }}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Retour au choix du jeu
          </button>
          
          {form.gameType === 'dames' ? (
            <PiCheckerboardFill className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          ) : (
            <TbPlayCardStar className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          )}
          
          <h2 className="text-2xl text-gray-900 font-bold font-heading">
            Créer une Partie de {form.gameType === 'dames' ? 'Dames' : 'Inter'}
          </h2>
          <p className="text-gray-600 mt-2">
            Configurez les paramètres de votre partie
          </p>
        </div>

        <div className="space-y-6">
          {/* Montant de la mise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <DollarSign className="h-4 w-4 inline mr-2" />
              Montant de la mise
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
              {quickBetAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, betAmount: amount.toString() }))
                    setCustomAmountActive(false)
                    setValidationError(null)
                  }}
                  className={`p-3 text-gray-600 rounded-lg border-2 text-center transition-all text-sm sm:text-base ${
                    !customAmountActive && parseFloat(form.betAmount) === amount
                      ? 'border-accent bg-accent/10 text-accent font-bold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {amount} $
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={form.betAmount}
                onChange={(e) => handleBetAmountChange(e.target.value)}
                onFocus={() => setCustomAmountActive(true)}
                placeholder="0.00"
                className="w-full pl-10 sm:pl-11 text-gray-600 pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg font-semibold transition-colors"
              />
              <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">$</span>
              </div>
            </div>
            
            {validationError?.field === 'betAmount' && (
              <p className="text-red-600 text-sm mt-2 flex items-center">
                ⚠️ {validationError.message}
              </p>
            )}
            
            <p className="text-gray-500 text-xs sm:text-sm mt-2">
              Le montant sera déduit de votre solde et remis en jeu pour le gagnant
            </p>
          </div>

          {/* Région */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin className="h-4 w-4 inline mr-2" />
              Région (optionnel)
            </label>
            <select
              value={form.region}
              onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
              className="w-full px-3 sm:px-4 py-3 sm:py-4 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
            >
              <option value="">Toutes les régions</option>
              {Object.entries(fr.regions || {}).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          {/* Info Jeu Sélectionné */}
          <div className={`rounded-xl p-4 sm:p-5 border ${
            form.gameType === 'dames' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-start space-x-3">
              {form.gameType === 'dames' ? (
                <PiCheckerboardFill className="h-5 w-5 mt-0.5 text-blue-600" />
              ) : (
                <TbPlayCardStar className="h-5 w-5 mt-0.5 text-purple-600" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {form.gameType === 'dames' ? 'Jeux de Dames' : 'Jeux d\'Inter'}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {getGameTypeDescription(form.gameType!)}
                </p>
                {form.gameType === 'inter' && (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Cartes spéciales:</strong> 2, 10, Joker, Ace, et 8 (Inter-Demande) avec des effets uniques
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Info Joueurs */}
          <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">Joueurs</span>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">2</div>
                <div className="text-xs sm:text-sm text-gray-600">Joueurs maximum</div>
              </div>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm mt-3">
              {form.gameType === 'inter' 
                ? "Partie en 1 contre 1 - Jeu de cartes avec stratégie et effets spéciaux"
                : "Partie en 1 contre 1 - Le format classique des dames avec stratégie avancée"
              }
            </p>
          </div>

          {/* Erreur générale */}
          {validationError?.field === 'general' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm flex items-center">
                ⚠️ {validationError.message}
              </p>
            </div>
          )}

          {/* Bouton Créer */}
          <button
            onClick={handleCreateGame}
            disabled={isLoading}
            className="w-full bg-primary text-white py-3 sm:py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-bold text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Création en cours...
              </div>
            ) : (
              `Créer la Partie de ${form.gameType === 'dames' ? 'Dames' : 'Inter'}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}