// app/dashboard/game/components/game-invitation.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, UserPlus, Mail, Clock, Check, X } from 'lucide-react'
import { fr } from '@/lib/i18n'

interface Player {
  id: string
  username: string
  region: string
  avatar_url: string | null
}

interface Invitation {
  id: string
  inviter: { username: string }[]
  game_room: { name: string; bet_amount: number }[]
  status: string
  created_at: string
}

export default function GameInvitation() {
  const [searchTerm, setSearchTerm] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [betAmount, setBetAmount] = useState(5)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadInvitations()
  }, [])

  const searchPlayers = async (term: string) => {
    if (term.length < 2) {
      setPlayers([])
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, region, avatar_url')
      .ilike('username', `%${term}%`)
      .limit(10)

    if (!error && data) {
      setPlayers(data)
    }
  }

  const loadInvitations = async () => {
    const { data, error } = await supabase
      .from('game_invitations')
      .select(`
        id,
        status,
        created_at,
        inviter:profiles!game_invitations_inviter_id_fkey(username),
        game_room:game_rooms(name, bet_amount)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setInvitations(data)
    }
  }

  const sendInvitation = async () => {
    if (!selectedPlayer) return

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Create a game room first
      const { data: game, error } = await supabase
        .from('game_rooms')
        .insert({
          name: `Partie Privée - ${betAmount}€`,
          bet_amount: betAmount,
          max_players: 2,
          status: 'waiting',
          created_by: user.id,
          board_state: JSON.stringify(initializeBoard())
        })
        .select()
        .single()

      if (error) throw error

      // Join the game as first player
      await supabase
        .from('game_participants')
        .insert({
          game_room_id: game.id,
          user_id: user.id,
          player_number: 1,
          is_ready: true
        })

      // Send invitation
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      await supabase
        .from('game_invitations')
        .insert({
          game_room_id: game.id,
          inviter_id: user.id,
          invitee_id: selectedPlayer.id,
          message: message,
          expires_at: expiresAt.toISOString()
        })

      alert('Invitation envoyée avec succès!')
      setSelectedPlayer(null)
      setMessage('')
      loadInvitations()

    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Erreur lors de l\'envoi de l\'invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('game_invitations')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', invitationId)
        .eq('invitee_id', user.id)

      if (accept) {
        // Join the game room
        const { data: invitation } = await supabase
          .from('game_invitations')
          .select('game_room_id')
          .eq('id', invitationId)
          .single()

        if (invitation) {
          await supabase
            .from('game_participants')
            .insert({
              game_room_id: invitation.game_room_id,
              user_id: user.id,
              player_number: 2,
              is_ready: true
            })
        }
      }

      loadInvitations()
    } catch (error) {
      console.error('Error responding to invitation:', error)
    }
  }

  const initializeBoard = () => {
    // Initialize board logic
    return Array(64).fill(null)
  }

  return (
    <div className="max-w-9xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Send Invitation */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              <UserPlus className="h-5 w-5 inline mr-2" />
              Inviter un joueur
            </h3>

            {/* Player Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un joueur
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    searchPlayers(e.target.value)
                  }}
                  placeholder="Nom d'utilisateur..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              {players.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                  {players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setSelectedPlayer(player)
                        setPlayers([])
                        setSearchTerm(player.username)
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{player.username}</div>
                      <div className="text-sm text-gray-600">{fr.regions[player.region as keyof typeof fr.regions]}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bet Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mise de la partie
              </label>
              <select
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={1}>1€</option>
                <option value={5}>5€</option>
                <option value={10}>10€</option>
                <option value={20}>20€</option>
                <option value={50}>50€</option>
              </select>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optionnel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Un message personnel pour votre adversaire..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={sendInvitation}
              disabled={!selectedPlayer || isLoading}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="h-4 w-4 inline mr-2" />
              Envoyer l'invitation
            </button>
          </div>

          {/* Right Column - Invitations */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Mes invitations
            </h3>

            {invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune invitation pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {invitations.map(invitation => (
                  <div key={invitation.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{invitation.game_room[0]?.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invitation.status === 'pending' ? 'En attente' :
                         invitation.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      De: {invitation.inviter[0]?.username} • {invitation.game_room[0]?.bet_amount}$
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      
                      {invitation.status === 'pending' && (
                        <div className="space-x-2">
                          <button
                            onClick={() => respondToInvitation(invitation.id, true)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => respondToInvitation(invitation.id, false)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}