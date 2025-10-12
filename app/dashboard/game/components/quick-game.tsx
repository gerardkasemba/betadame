// app/dashboard/game/components/quick-game.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Users, DollarSign, Zap, Trophy } from 'lucide-react'
import { fr } from '@/lib/i18n'

interface QuickGameForm {
  betAmount: string
  region: string
  gameType: 'quick' | 'ranked'
  maxPlayers: number
}

interface ValidationError {
  field: string
  message: string
}

export default function QuickGame() {
  const [form, setForm] = useState<QuickGameForm>({
    betAmount: '5.00',
    region: '',
    gameType: 'quick',
    maxPlayers: 2
  })
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState<ValidationError | null>(null)
  const [customAmountActive, setCustomAmountActive] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const validateForm = (): boolean => {
    setValidationError(null)

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

      // Vérifier le solde utilisateur (sans rating)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance, games_played') // Retirer rating de la sélection
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

      // Pour les parties classées, vérifier l'expérience (nombre de parties jouées au lieu du rating)
      if (form.gameType === 'ranked' && (profile.games_played || 0) < 5) {
        setValidationError({
          field: 'gameType',
          message: 'Minimum 5 parties jouées requis pour les parties classées'
        })
        setIsLoading(false)
        return
      }

      // Créer la salle de jeu
      const gameName = form.gameType === 'ranked' 
        ? `Partie Classée - ${betAmount.toFixed(2)}$` 
        : `Partie Rapide - ${betAmount.toFixed(2)}$`

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
          game_type: form.gameType === 'ranked' ? 'checkers_ranked' : 'checkers',
          board_state: initializeBoard(),
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

      // Rediriger vers la salle de jeu
      router.push(`/dashboard/game/p/${game.id}`)

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

  return (
    <div className="max-w-9xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Zap className="h-12 w-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl text-gray-900 font-bold text-foreground font-heading">
            Partie Rapide
          </h2>
          <p className="text-gray-600 mt-2">
            Créez une partie et commencez à jouer immédiatement
          </p>
        </div>

        <div className="space-y-6">
          {/* Montant de la mise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <DollarSign className="h-4 w-4 inline mr-2" />
              Montant de la mise
            </label>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {quickBetAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, betAmount: amount.toString() }))
                    setCustomAmountActive(false)
                    setValidationError(null)
                  }}
                  className={`p-3 text-gray-600 rounded-lg border-2 text-center transition-all ${
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
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={form.betAmount}
                onChange={(e) => handleBetAmountChange(e.target.value)}
                onFocus={() => setCustomAmountActive(true)}
                placeholder="0.00"
                className="w-full pl-11 text-gray-600 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold transition-colors"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">$</span>
              </div>
            </div>
            
            {validationError?.field === 'betAmount' && (
              <p className="text-red-600 text-sm mt-2 flex items-center">
                ⚠️ {validationError.message}
              </p>
            )}
            
            <p className="text-gray-500 text-sm mt-2">
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
              className="w-full px-4 py-4 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Toutes les régions</option>
              {Object.entries(fr.regions || {}).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          {/* Type de partie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de partie
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, gameType: 'quick' }))}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  form.gameType === 'quick'
                    ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Zap className="h-6 w-6 mx-auto mb-2" />
                Partie Rapide
                <p className="text-sm text-gray-600 mt-1">Démarrage immédiat</p>
              </button>
              
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, gameType: 'ranked' }))}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  form.gameType === 'ranked'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Trophy className="h-6 w-6 mx-auto mb-2 " />
                Partie Classée
                <p className="text-sm text-gray-600 mt-1 text-gray-600">2 Jouées</p>
                {/* <p className="text-sm text-gray-600 mt-1 text-gray-600">Minimum 5 parties jouées</p> */}
              </button>
            </div>
            
            {validationError?.field === 'gameType' && (
              <p className="text-red-600 text-sm mt-2 flex items-center">
                ⚠️ {validationError.message}
              </p>
            )}
          </div>

          {/* Info Joueurs */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Joueurs</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">2</div>
                <div className="text-sm text-gray-600">Joueurs maximum</div>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              Partie en 1 contre 1 - Le format classique des dames congolaises
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
            className="w-full bg-primary text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Création en cours...
              </div>
            ) : (
              'Créer la Partie'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}