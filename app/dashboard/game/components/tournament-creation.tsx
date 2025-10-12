// app/dashboard/game/components/tournament-creation.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { Calendar, Users, DollarSign, MapPin, Lock, Globe, Trophy, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { fr } from '@/lib/i18n'

interface TournamentForm {
  name: string
  description: string
  type: 'public' | 'private' | 'regional'
  region: string
  betAmount: number
  maxPlayers: number
  startDate: string
  endDate: string
}

interface UserValidation {
  canCreateTournament: boolean
  reasons: string[]
  minGamesPlayed: number
  minAccountAge: number
  gamesPlayed: number
  accountAgeDays: number
}

export default function TournamentCreation() {
  const [form, setForm] = useState<TournamentForm>({
    name: '',
    description: '',
    type: 'public',
    region: '',
    betAmount: 10,
    maxPlayers: 8,
    startDate: '',
    endDate: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [userValidation, setUserValidation] = useState<UserValidation | null>(null)
  const [customBetAmount, setCustomBetAmount] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()

  // Validate user eligibility to create tournaments
  const validateUser = async (userId: string) => {
    try {
      // Get user stats - we need to calculate games played from game history
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, is_verified')
        .eq('id', userId)
        .single()

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé')
      }

      // Calculate games played from game history (you'll need to implement this based on your games table)
      const { count: gamesPlayed } = await supabase
        .from('game_sessions') // Replace with your actual games table
        .select('*', { count: 'exact', head: true })
        .eq('player_id', userId)
        .eq('status', 'completed')

      // Calculate account age
      const accountAgeDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
      
      // Requirements
      const minAccountAge = 7 // days
      const minGamesPlayed = 0
      const isVerified = profile.is_verified || true

      const reasons: string[] = []
      
      if (accountAgeDays < minAccountAge) {
        reasons.push(`Compte trop récent (${accountAgeDays}/${minAccountAge} jours)`)
      }
      
      if ((gamesPlayed || 0) < minGamesPlayed) {
        reasons.push(`Nombre de parties insuffisant (${gamesPlayed || 0}/${minGamesPlayed})`)
      }
      
      if (!isVerified) {
        reasons.push('Compte non vérifié')
      }

      const canCreateTournament = reasons.length === 0

      setUserValidation({
        canCreateTournament,
        reasons,
        minGamesPlayed,
        minAccountAge,
        gamesPlayed: gamesPlayed || 0,
        accountAgeDays
      })

      return canCreateTournament
    } catch (error) {
      console.error('Error validating user:', error)
      return false
    }
  }

  useEffect(() => {
    const checkUserEligibility = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await validateUser(user.id)
      }
    }
    checkUserEligibility()
  }, [])

  const handleCreateTournament = async () => {
    if (!userValidation?.canCreateTournament) {
      addToast({
        type: 'error',
        title: 'Création de tournoi non autorisée',
        message: 'Vous ne remplissez pas les conditions requises pour créer un tournoi',
        duration: 5000
      })
      return
    }

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Validate form
      if (!form.name.trim()) {
        addToast({
          type: 'error',
          title: 'Nom manquant',
          message: 'Veuillez donner un nom à votre tournoi',
          duration: 5000
        })
        return
      }

      if (!form.startDate || !form.endDate) {
        addToast({
          type: 'error',
          title: 'Dates manquantes',
          message: 'Veuillez spécifier les dates de début et de fin',
          duration: 5000
        })
        return
      }

      // Validate dates
      const startDate = new Date(form.startDate)
      const endDate = new Date(form.endDate)
      const now = new Date()

      if (startDate < now) {
        addToast({
          type: 'error',
          title: 'Date invalide',
          message: 'La date de début doit être dans le futur',
          duration: 5000
        })
        return
      }

      if (startDate >= endDate) {
        addToast({
          type: 'error',
          title: 'Dates invalides',
          message: 'La date de fin doit être après la date de début',
          duration: 5000
        })
        return
      }

      // Validate tournament duration (max 30 days)
      const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      if (durationDays > 30) {
        addToast({
          type: 'error',
          title: 'Durée trop longue',
          message: 'La durée du tournoi ne peut pas dépasser 30 jours',
          duration: 5000
        })
        return
      }

      // Validate bet amount
      if (form.betAmount < 1 || form.betAmount > 1000) {
        addToast({
          type: 'error',
          title: 'Mise invalide',
          message: 'La mise doit être comprise entre 1€ et 1000€',
          duration: 5000
        })
        return
      }

      // Check user balance for tournament creation fee + bet amount
      const creationFee = 5 // €
      const totalRequired = creationFee + form.betAmount

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single()

      if (!profile || profile.balance < totalRequired) {
        addToast({
          type: 'error',
          title: 'Solde insuffisant',
          message: `Frais de création: ${creationFee}€ + Mise: ${form.betAmount}€ = ${totalRequired}€ requis. Votre solde: ${profile?.balance || 0}€`,
          duration: 5000
        })
        return
      }

      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          type: form.type,
          region: form.type === 'regional' ? form.region : null,
          bet_amount: form.betAmount,
          max_players: form.maxPlayers,
          current_players: 1, // Creator is automatically added
          start_date: form.startDate,
          end_date: form.endDate,
          created_by: user.id,
          status: 'registration'
        })
        .select()
        .single()

      if (tournamentError) throw tournamentError

      // Add creator as first participant
      const { error: participantError } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: user.id,
          status: 'registered',
          seed: 1
        })

      if (participantError) throw participantError

      // Deduct creation fee and bet amount
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance - totalRequired
        })
        .eq('id', user.id)

      if (balanceError) throw balanceError

      // Create transaction records - update transaction types
      await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            type: 'tournament_creation_fee',
            amount: creationFee,
            status: 'completed',
            reference: `TOURNAMENT-CREATION-${tournament.id}`,
            description: `Frais de création du tournoi: ${tournament.name}`
          },
          {
            user_id: user.id,
            type: 'tournament_bet',
            amount: form.betAmount,
            status: 'completed',
            reference: `TOURNAMENT-BET-${tournament.id}`,
            description: `Mise organisateur pour le tournoi: ${tournament.name}`
          }
        ])

      addToast({
        type: 'success',
        title: 'Tournoi créé avec succès! 🎉',
        message: `Votre tournoi "${tournament.name}" est maintenant ouvert aux inscriptions`,
        duration: 5000
      })

      router.push(`/dashboard/tournaments/${tournament.id}`)

    } catch (error: any) {
      console.error('Error creating tournament:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création du tournoi',
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBetAmountChange = (amount: number | string) => {
    if (typeof amount === 'number') {
      setForm(prev => ({ ...prev, betAmount: amount }))
      setCustomBetAmount('')
    } else {
      const value = parseFloat(amount)
      if (!isNaN(value) && value >= 1 && value <= 1000) {
        setForm(prev => ({ ...prev, betAmount: value }))
      }
      setCustomBetAmount(amount)
    }
  }

  const tournamentTypes = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Ouvert à tous les joueurs' },
    { value: 'private', label: 'Privé', icon: Lock, description: 'Sur invitation seulement' },
    { value: 'regional', label: 'Régional', icon: MapPin, description: 'Joueurs de votre région' }
  ]

  const playerOptions = [4, 8, 16, 32, 64] // Added 4 players option
  const presetBetAmounts = [5, 10, 25, 50, 100]

  const getMinStartDate = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1) // Minimum 1 hour from now
    return now.toISOString().slice(0, 16)
  }

  const getMinEndDate = () => {
    if (!form.startDate) return ''
    const start = new Date(form.startDate)
    start.setHours(start.getHours() + 1) // Minimum 1 hour after start
    return start.toISOString().slice(0, 16)
  }

  if (!userValidation) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-gray-600 mt-4">Vérification de votre éligibilité...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header with Validation Status */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-12 w-12 text-accent mr-4" />
            {userValidation.canCreateTournament ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-amber-500" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground font-heading">
            Créer un Tournoi
          </h2>
          <p className="text-gray-600 mt-2">
            {userValidation.canCreateTournament 
              ? 'Vous pouvez créer un tournoi. Remplissez les informations ci-dessous.'
              : 'Vous ne remplissez pas encore les conditions pour créer un tournoi.'
            }
          </p>
        </div>

        {/* User Requirements Status */}
        {!userValidation.canCreateTournament && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Conditions requises pour créer un tournoi
            </h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li className={userValidation.accountAgeDays >= userValidation.minAccountAge ? 'text-green-600' : ''}>
                • Compte actif depuis au moins {userValidation.minAccountAge} jours 
                ({userValidation.accountAgeDays}/{userValidation.minAccountAge})
              </li>
              <li className={userValidation.gamesPlayed >= userValidation.minGamesPlayed ? 'text-green-600' : ''}>
                • Au moins {userValidation.minGamesPlayed} parties jouées 
                ({userValidation.gamesPlayed}/{userValidation.minGamesPlayed})
              </li>
              <li>• Compte vérifié</li>
            </ul>
            {userValidation.reasons.length > 0 && (
              <div className="mt-3">
                <p className="text-amber-800 font-medium">Raisons du refus:</p>
                <ul className="text-sm text-amber-700 mt-1">
                  {userValidation.reasons.map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* Tournament Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du tournoi *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ex: Tournoi des Champions de Kinshasa"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={100}
                required
                disabled={!userValidation.canCreateTournament}
              />
              <div className="text-xs text-gray-500 mt-1">
                {form.name.length}/100 caractères
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez votre tournoi, les règles spéciales, les prix..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={500}
                disabled={!userValidation.canCreateTournament}
              />
              <div className="text-xs text-gray-500 mt-1">
                {form.description.length}/500 caractères
              </div>
            </div>

            {/* Tournament Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Type de tournoi *
              </label>
              <div className="space-y-3">
                {tournamentTypes.map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, type: type.value as any }))}
                      disabled={!userValidation?.canCreateTournament}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        form.type === type.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!userValidation?.canCreateTournament ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <div className="font-semibold">{type.label}</div>
                          <div className="text-sm text-gray-600">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Region (if regional) */}
            {form.type === 'regional' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Région *
                </label>
                <select
                  value={form.region}
                  onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={!userValidation.canCreateTournament}
                >
                  <option value="">Sélectionnez une région</option>
                  {Object.entries(fr.regions).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Bet Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <DollarSign className="h-4 w-4 inline mr-2" />
                Mise organisateur *
              </label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {presetBetAmounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleBetAmountChange(amount)}
                    disabled={!userValidation?.canCreateTournament}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      form.betAmount === amount && !customBetAmount
                        ? 'border-accent bg-accent/10 text-accent font-bold'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!userValidation?.canCreateTournament ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {amount} €
                  </button>
                ))}
              </div>
              
              {/* Custom Amount Input */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Ou saisissez un montant personnalisé (1€ - 1000€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={customBetAmount}
                    onChange={(e) => handleBetAmountChange(e.target.value)}
                    placeholder="Montant personnalisé"
                    min="1"
                    max="1000"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                    disabled={!userValidation.canCreateTournament}
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    €
                  </span>
                </div>
              </div>
            </div>

            {/* Max Players - Updated with 4 players option */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Users className="h-4 w-4 inline mr-2" />
                Nombre maximum de joueurs *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {playerOptions.map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, maxPlayers: count }))}
                    disabled={!userValidation?.canCreateTournament}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      form.maxPlayers === count
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!userValidation?.canCreateTournament ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {count} Joueurs
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Date de début *
                </label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  min={getMinStartDate()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={!userValidation.canCreateTournament}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Date de fin *
                </label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  min={getMinEndDate()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={!userValidation.canCreateTournament}
                />
              </div>
            </div>

            {/* Tournament Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Aperçu du tournoi</h4>
              <div className="text-sm space-y-1 text-gray-600">
                <div>Type: {tournamentTypes.find(t => t.value === form.type)?.label}</div>
                <div>Joueurs: {form.maxPlayers} maximum</div>
                <div>Mise organisateur: {form.betAmount}€</div>
                <div>Frais de création: 5€</div>
                <div className="font-semibold text-foreground">
                  Total à débourser: {form.betAmount + 5}€
                </div>
                {form.startDate && form.endDate && (
                  <div>Durée: {
                    Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24))
                  } jours</div>
                )}
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateTournament}
              disabled={isLoading || !userValidation.canCreateTournament || !form.name || !form.startDate || !form.endDate}
              className="w-full bg-primary text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création en cours...
                </>
              ) : (
                `Créer le Tournoi (${form.betAmount + 5}€)`
              )}
            </button>

            {/* Terms Notice */}
            <div className="text-xs text-gray-500 text-center">
              En créant ce tournoi, vous acceptez les{' '}
              <a href="/terms/tournaments" className="text-primary hover:underline">
                conditions d'utilisation des tournois
              </a>
              . La mise organisateur sera distribuée aux gagnants.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}