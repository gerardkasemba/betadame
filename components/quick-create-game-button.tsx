'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Users, DollarSign, Crown, X, Plus } from 'lucide-react'
import { PiCheckerboardFill } from "react-icons/pi";
import { TbPlayCardStar } from "react-icons/tb";
import { fr } from '@/lib/i18n'
import { InterCardGame } from '@/lib/inter-card'
import { notificationService, NotificationType } from '@/lib/notifications'

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

interface Position {
  x: number
  y: number
}

export default function QuickCreateGameButton() {
  const [isExpanded, setIsExpanded] = useState(false)
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
  const [isVisible, setIsVisible] = useState(true)
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 })
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Hide component on specific routes
  useEffect(() => {
    const hiddenRoutes = [
      '/dashboard/game/inter/',
      '/dashboard/game/p/'
    ]
    
    const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route))
    setIsVisible(!shouldHide)
  }, [pathname])

  // Handle mouse down for drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return // Don't drag when expanded
    
    setIsDragging(true)
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    
    e.preventDefault()
  }

  // Handle touch start for mobile drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExpanded) return // Don't drag when expanded
    
    setIsDragging(true)
    if (buttonRef.current && e.touches[0]) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      })
    }
    
    e.preventDefault()
  }

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Constrain to viewport boundaries
      const constrainedX = Math.max(0, Math.min(window.innerWidth - 100, newX))
      const constrainedY = Math.max(0, Math.min(window.innerHeight - 60, newY))
      
      setPosition({ x: constrainedX, y: constrainedY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return
      
      const newX = e.touches[0].clientX - dragOffset.x
      const newY = e.touches[0].clientY - dragOffset.y
      
      // Constrain to viewport boundaries
      const constrainedX = Math.max(0, Math.min(window.innerWidth - 100, newX))
      const constrainedY = Math.max(0, Math.min(window.innerHeight - 60, newY))
      
      setPosition({ x: constrainedX, y: constrainedY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, dragOffset])

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

  // Function to send notification to users about new game
  const sendNewGameNotification = async (userPhone: string, gameData: any) => {
    try {
      await notificationService.sendNotification({
        phoneNumber: userPhone,
        type: NotificationType.NEW_GAME_CREATED,
        data: {
          gameTitle: gameData.gameTitle,
          betAmount: gameData.betAmount,
          currency: gameData.currency,
          region: gameData.region
        }
      });
      console.log('New game notification sent successfully');
    } catch (error) {
      console.error('Failed to send new game notification:', error);
      // Don't throw error here - notification failure shouldn't block game creation
    }
  }

  // Function to get user's phone number from profile
  const getUserPhoneNumber = async (userId: string): Promise<string | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user phone:', error);
        return null;
      }

      return profile?.phone_number || null;
    } catch (error) {
      console.error('Error in getUserPhoneNumber:', error);
      return null;
    }
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
        .select('balance, games_played, phone_number')
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
      let displayGameType = '';
      
      switch (form.gameType) {
        case 'inter':
          gameType = 'inter_demande';
          gameName = `Jeux d'Inter - ${betAmount.toFixed(2)}$`;
          displayGameType = "Jeux d'Inter";
          break;
        case 'dames':
        default:
          gameType = 'checkers';
          gameName = `Partie de Dames - ${betAmount.toFixed(2)}$`;
          displayGameType = 'Dames Classiques';
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

      // Send notification to the user who created the game
      if (profile.phone_number) {
        await sendNewGameNotification(profile.phone_number, {
          gameTitle: displayGameType,
          betAmount: betAmount.toFixed(2),
          currency: 'USD',
          region: form.region || 'Toutes les régions'
        });
      } else {
        console.warn('User phone number not found, skipping notification');
      }

      // Reset form and close
      setIsExpanded(false)
      setSelectedGame(null)
      setForm({
        betAmount: '5.00',
        region: '',
        gameType: null,
        maxPlayers: 2
      })

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

  const resetForm = () => {
    setIsExpanded(false)
    setSelectedGame(null)
    setForm({
      betAmount: '5.00',
      region: '',
      gameType: null,
      maxPlayers: 2
    })
    setValidationError(null)
    setCustomAmountActive(false)
  }

  if (!isVisible) return null

  // Main floating button with drag functionality
  if (!isExpanded) {
    return (
      <button
        ref={buttonRef}
        onClick={() => setIsExpanded(true)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: isDragging ? 'scale(1.1)' : 'none',
          zIndex: 50,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        className={`bg-blue-800 text-white hover:pointer p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
          isDragging ? 'shadow-2xl' : 'hover:scale-110'
        }`}
        title="Créer une partie rapide (glisser pour déplacer)"
      >
        <Plus className="h-6 w-6" />
        <span>Créer une Partie</span>
      </button>
    )
  }

  // Expanded overlay form (centered, not draggable)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Créer une Partie Rapide
          </h2>
          <button
            onClick={resetForm}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* First screen - Game selection */}
          {!selectedGame ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Crown className="h-8 w-8 text-accent mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  Choisissez le type de jeu
                </p>
              </div>

              {/* Jeux de Dames */}
              <button
                onClick={() => handleGameSelect('dames')}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PiCheckerboardFill className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Jeux de Dames</h3>
                    <p className="text-gray-600 text-sm">Stratégie classique</p>
                  </div>
                </div>
              </button>

              {/* Jeux de Carte (Inter) */}
              <button
                onClick={() => handleGameSelect('inter')}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <TbPlayCardStar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Jeux d'Inter</h3>
                    <p className="text-gray-600 text-sm">Cartes et défis</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            /* Second screen - Game configuration */
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => setSelectedGame(null)}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                ← Retour
              </button>

              {/* Bet Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Montant de la mise
                </label>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {quickBetAmounts.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, betAmount: amount.toString() }))
                        setCustomAmountActive(false)
                        setValidationError(null)
                      }}
                      className={`p-2 text-sm rounded-lg border text-center transition-all ${
                        !customAmountActive && parseFloat(form.betAmount) === amount
                          ? 'border-accent bg-accent/10 text-accent font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {amount} $
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.betAmount}
                    onChange={(e) => handleBetAmountChange(e.target.value)}
                    onFocus={() => setCustomAmountActive(true)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                {validationError?.field === 'betAmount' && (
                  <p className="text-red-600 text-xs mt-1 flex items-center">
                    ⚠️ {validationError.message}
                  </p>
                )}
              </div>

              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Région (optionnel)
                </label>
                <select
                  value={form.region}
                  onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                >
                  <option value="">Toutes les régions</option>
                  {Object.entries(fr.regions || {}).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              {/* Game Info */}
              <div className={`rounded-lg p-3 border text-sm ${
                form.gameType === 'dames' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {form.gameType === 'dames' ? (
                    <PiCheckerboardFill className="h-4 w-4 text-blue-600" />
                  ) : (
                    <TbPlayCardStar className="h-4 w-4 text-purple-600" />
                  )}
                  <span className="font-medium">
                    {form.gameType === 'dames' ? 'Dames Classiques' : 'Jeux d\'Inter'}
                  </span>
                </div>
                <p className="text-gray-600 text-xs mt-1">
                  {getGameTypeDescription(form.gameType!)}
                </p>
              </div>

              {/* General Error */}
              {validationError?.field === 'general' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-xs flex items-center">
                    ⚠️ {validationError.message}
                  </p>
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateGame}
                disabled={isLoading}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </div>
                ) : (
                  `Créer Partie ${form.gameType === 'dames' ? 'Dames' : 'Inter'}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}